import fs from "node:fs";
import path from "node:path";
import { expect, type Browser, type Locator, type Page, test } from "@playwright/test";

const baseUrl = "http://127.0.0.1:5173/";
const auditDir = path.join("design-review", "full-audit");
const runtimeLogPath = path.join(auditDir, "runtime-log.json");

type AuditViewport = { width: number; height: number };

const viewports: Record<"desktop" | "largeDesktop" | "tablet" | "mobile", AuditViewport> = {
  desktop: { width: 1440, height: 1100 },
  largeDesktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
};

interface RuntimeEvent {
  kind: "console" | "pageerror" | "requestfailed" | "note";
  scenario: string;
  message: string;
  url?: string;
}

const runtimeEvents: RuntimeEvent[] = [];

test.describe.configure({ mode: "serial" });
test.setTimeout(420000);

test.beforeAll(() => {
  fs.rmSync(auditDir, { recursive: true, force: true });
  fs.mkdirSync(auditDir, { recursive: true });
});

test.afterAll(() => {
  fs.writeFileSync(runtimeLogPath, `${JSON.stringify(runtimeEvents, null, 2)}\n`, "utf8");
});

function note(scenario: string, message: string) {
  runtimeEvents.push({ kind: "note", scenario, message });
}

function collectRuntime(page: Page, scenario: string) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      runtimeEvents.push({
        kind: "console",
        scenario,
        message: `${message.type()}: ${message.text()}`,
        url: page.url()
      });
    }
  });
  page.on("pageerror", (error) => {
    runtimeEvents.push({ kind: "pageerror", scenario, message: error.message, url: page.url() });
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    runtimeEvents.push({
      kind: "requestfailed",
      scenario,
      message: `${request.method()} ${request.url()} ${failure?.errorText ?? "failed"}`,
      url: page.url()
    });
  });
}

async function gotoApp(page: Page, scenario: string, viewport: AuditViewport = viewports.desktop) {
  collectRuntime(page, scenario);
  await page.setViewportSize(viewport);
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await expect(page.getByText(/SUN\/MOON ASTRO TERMINAL/i)).toBeVisible({ timeout: 20000 });
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: path.join(auditDir, `${name}.png`), fullPage: true });
  await page.screenshot({ path: path.join(auditDir, `${name}-above-fold.png`), fullPage: false });
}

async function clickIfVisible(page: Page, selectorOrRoleName: string | RegExp, scenario: string) {
  const locator = typeof selectorOrRoleName === "string"
    ? page.locator(selectorOrRoleName)
    : page.getByRole("button", { name: selectorOrRoleName });
  const count = await locator.count();
  if (count === 0) {
    note(scenario, `Missing clickable target: ${String(selectorOrRoleName)}`);
    return false;
  }
  await locator.first().click({ timeout: 5000 }).catch((error) => note(scenario, `Click failed: ${String(selectorOrRoleName)}: ${error.message}`));
  return true;
}

async function analyze(page: Page) {
  await page.getByRole("button", { name: /analyze night/i }).click();
  await page.waitForTimeout(250);
}

async function chooseGridBodyFilter(page: Page, grid: Locator, index: number) {
  const filter = grid.locator('input[name="body-filter"]').nth(index);
  await filter.focus();
  await page.keyboard.press("Space");
}

async function selectMode(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).click();
  await page.waitForTimeout(250);
}

async function setDateAndAnalyze(page: Page, date: string) {
  await page.locator('input[type="date"]').first().fill(date);
  await analyze(page);
}

async function openLocationEditor(page: Page) {
  const changeButton = page.locator(".control-location").getByRole("button", { name: /change|aendern|ändern/i });
  if ((await changeButton.count()) > 0) {
    await changeButton.first().click();
    await page.waitForTimeout(150);
  }
}

async function setManualLocation(page: Page, name: string, latitude: string, longitude: string, elevation = "0", timeZone?: string) {
  await openLocationEditor(page);
  const manualTab = page.getByRole("tab", { name: /manual|manuell/i });
  if ((await manualTab.count()) > 0) await manualTab.click();
  await page.getByLabel(/location name|ortsname/i).fill(name);
  await page.getByLabel(/latitude/i).fill(latitude);
  await page.getByLabel(/longitude/i).fill(longitude);
  await page.getByLabel(/elevation|höhe/i).fill(elevation);
  if (timeZone) {
    await page.locator(".control-timezone select").selectOption(timeZone);
  }
}

async function searchPlace(page: Page, query: string, scenario: string) {
  await openLocationEditor(page);
  const searchTab = page.getByRole("tab", { name: /search|suchen|plz|postal/i });
  if ((await searchTab.count()) > 0) await searchTab.click();
  const searchInput = page.locator(".location-search-panel input").first();
  await searchInput.fill(query);
  await page.getByRole("button", { name: /^search$|^suchen$/i }).click();
  await page.waitForTimeout(3500);
  const results = await page.locator(".terminal-result-list article").count();
  const messages = await page.locator(".compact-messages").textContent().catch(() => "");
  note(scenario, `Geocoding query "${query}" produced ${results} rendered result(s). Messages: ${messages ?? ""}`);
}

async function newAuditPage(browser: Browser, scenario: string, viewport: AuditViewport = viewports.desktop) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await gotoApp(page, scenario, viewport);
  return { context, page };
}

test("01 initial state, language and CRT states", async ({ page }) => {
  await gotoApp(page, "initial-desktop", viewports.desktop);
  await capture(page, "initial-desktop");

  await page.setViewportSize(viewports.mobile);
  await capture(page, "initial-mobile");

  await page.setViewportSize(viewports.desktop);
  await page.locator(".terminal-language select").selectOption("en");
  await capture(page, "language-en");
  await page.locator(".terminal-language select").selectOption("de");
  await capture(page, "language-de");

  await capture(page, "crt-on");
  await page.getByRole("button", { name: /crt fx/i }).click();
  await capture(page, "crt-off");
  await page.getByRole("button", { name: /crt fx/i }).click();
});

test("02 analysis modes", async ({ page }) => {
  await gotoApp(page, "analysis-modes", viewports.desktop);
  await selectMode(page, /single|einzel/i);
  await capture(page, "mode-single-time");
  await selectMode(page, /one night|eine nacht/i);
  await capture(page, "mode-one-night");
  await selectMode(page, /multiple|mehrere/i);
  await capture(page, "mode-multi-night");
  await selectMode(page, /custom|benutzer/i);
  await capture(page, "mode-custom");
});

test("03 night date scenarios", async ({ page }) => {
  await gotoApp(page, "night-date-scenarios", viewports.desktop);
  await setManualLocation(page, "Berlin", "52.520000", "13.405000", "34", "Europe/Berlin");
  await setDateAndAnalyze(page, "2026-07-05");
  await capture(page, "night-summer-no-astro");
  await setDateAndAnalyze(page, "2026-12-15");
  await capture(page, "night-winter-good");
  await setDateAndAnalyze(page, "2026-03-29");
  await capture(page, "night-dst-transition");
  await setManualLocation(page, "Tromso", "69.6492", "18.9553", "10", "Europe/Oslo");
  await setDateAndAnalyze(page, "2026-06-21");
  await capture(page, "night-high-latitude");
  await setManualLocation(page, "Equator 0/0", "0", "0", "0", "UTC");
  await setDateAndAnalyze(page, "2026-07-05");
  await capture(page, "night-equator");
});

test("04 imaging modes", async ({ page }) => {
  await gotoApp(page, "imaging-modes", viewports.desktop);
  await setDateAndAnalyze(page, "2026-07-05");
  await page.locator(".control-quality select").selectOption("strict");
  await capture(page, "imaging-strict");
  await page.locator(".control-quality select").selectOption("balanced");
  await capture(page, "imaging-balanced");
  await page.locator(".control-quality select").selectOption("bright");
  await capture(page, "imaging-bright");
  note("imaging-modes", "Mode changes are captured without pressing Analyze again to reveal whether derived focus/window state updates automatically.");
});

test("05 target body modes", async ({ page }) => {
  await gotoApp(page, "target-body-modes", viewports.desktop);
  await page.locator(".control-target select").selectOption("sun");
  await analyze(page);
  await capture(page, "target-sun");
  await page.locator(".control-target select").selectOption("moon");
  await analyze(page);
  await capture(page, "target-moon");
  await page.locator(".control-target select").selectOption("both");
  await analyze(page);
  await capture(page, "target-both");
});

test("06 manual location, geocoding, gps and saved locations", async ({ page, browser }) => {
  await gotoApp(page, "location-functions", viewports.desktop);
  await setManualLocation(page, "Geiselhoering", "48.825", "12.397", "0", "Europe/Berlin");
  await analyze(page);
  await capture(page, "manual-location-valid");

  await page.getByLabel(/latitude/i).fill("91");
  await analyze(page);
  await capture(page, "manual-location-invalid-lat");
  await page.getByLabel(/latitude/i).fill("48.825");
  await page.getByLabel(/longitude/i).fill("181");
  await analyze(page);
  await capture(page, "manual-location-invalid-lon");
  await page.getByLabel(/latitude/i).fill("");
  await page.getByLabel(/longitude/i).fill("");
  await analyze(page);
  await capture(page, "manual-location-empty");

  await searchPlace(page, "Berlin", "geocoding-berlin");
  await capture(page, "geocoding-berlin");
  await searchPlace(page, "94333", "geocoding-plz");
  await capture(page, "geocoding-plz");
  await searchPlace(page, "asdfasdfasdf", "geocoding-no-result");
  await capture(page, "geocoding-no-result");
  await searchPlace(page, "London", "geocoding-multiple-results");
  await capture(page, "geocoding-multiple-results");

  await setManualLocation(page, "QA Berlin", "52.520000", "13.405000", "34", "Europe/Berlin");
  await page.getByRole("tab", { name: /saved|gespeicherte/i }).click();
  await capture(page, "saved-location-empty");
  await page.locator(".saved-location-panel input").first().fill("QA Berlin");
  await page.getByRole("button", { name: /save current|aktuellen ort/i }).click();
  await capture(page, "saved-location-created");
  await page.locator(".compact-saved-list").getByRole("button", { name: /apply|anwenden/i }).first().click({ timeout: 5000 });
  await capture(page, "saved-location-applied");
  await page.locator(".compact-saved-list").getByRole("button", { name: /delete|löschen|loeschen/i }).first().click({ timeout: 5000 });
  await capture(page, "saved-location-deleted");

  const gpsSuccess = await newAuditPage(browser, "gps-success", viewports.desktop);
  await gpsSuccess.context.grantPermissions(["geolocation"]);
  await gpsSuccess.context.setGeolocation({ latitude: 48.825, longitude: 12.397 });
  await gpsSuccess.page.locator(".control-location").getByRole("button", { name: /gps/i }).click();
  await gpsSuccess.page.waitForTimeout(1000);
  await capture(gpsSuccess.page, "gps-success");
  await gpsSuccess.context.close();

  const gpsDenied = await newAuditPage(browser, "gps-denied", viewports.desktop);
  await gpsDenied.context.clearPermissions();
  await gpsDenied.page.locator(".control-location").getByRole("button", { name: /gps/i }).click();
  await gpsDenied.page.waitForTimeout(1500);
  await capture(gpsDenied.page, "gps-denied");
  await gpsDenied.context.close();

  const gpsUnavailableContext = await browser.newContext({ viewport: viewports.desktop });
  await gpsUnavailableContext.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(_success: PositionCallback, error: PositionErrorCallback) {
          error({ code: 2, message: "Position unavailable", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
        }
      }
    });
  });
  const gpsUnavailablePage = await gpsUnavailableContext.newPage();
  await gotoApp(gpsUnavailablePage, "gps-unavailable", viewports.desktop);
  await gpsUnavailablePage.locator(".control-location").getByRole("button", { name: /gps/i }).click();
  await gpsUnavailablePage.waitForTimeout(1500);
  await capture(gpsUnavailablePage, "gps-unavailable");
  await gpsUnavailableContext.close();
});

test("07 timezone, interval and refraction", async ({ page }) => {
  await gotoApp(page, "timezone-interval-refraction", viewports.desktop);
  for (const [zone, name] of [
    ["Europe/Berlin", "tz-berlin"],
    ["UTC", "tz-utc"],
    ["America/New_York", "tz-new-york"],
    ["Australia/Sydney", "tz-sydney"],
    ["Europe/London", "tz-london"]
  ] as const) {
    await page.locator(".control-timezone select").selectOption(zone);
    await analyze(page);
    await capture(page, name);
  }

  for (const [option, name] of [["1", "interval-1min"], ["60", "interval-60min"]] as const) {
    await page.locator(".control-interval select").selectOption(option);
    await analyze(page);
    await capture(page, name);
  }

  await page.locator(".control-interval select").selectOption("custom");
  await page.locator(".control-interval input").fill("2");
  await analyze(page);
  await capture(page, "interval-custom-valid");
  await page.locator(".control-interval input").fill("0");
  await analyze(page);
  await capture(page, "interval-custom-invalid-zero");
  await page.locator(".control-interval input").fill("9999");
  await analyze(page);
  await capture(page, "interval-custom-too-large");

  await openLocationEditor(page);
  await page.getByRole("tab", { name: /manual|manuell/i }).click();
  await page.getByLabel(/refraction|refraktion/i).selectOption("none");
  await analyze(page);
  await capture(page, "refraction-none");
  await page.getByLabel(/refraction|refraktion/i).selectOption("standard");
  await analyze(page);
  await capture(page, "refraction-standard");
  await page.getByLabel(/refraction|refraktion/i).selectOption("custom");
  await page.getByLabel(/pressure|druck/i).fill("1013.25");
  await page.getByLabel(/temperature|temperatur/i).fill("15");
  await analyze(page);
  await capture(page, "refraction-custom-valid");
  await page.getByLabel(/pressure|druck/i).fill("0");
  await page.getByLabel(/temperature|temperatur/i).fill("");
  await analyze(page);
  await capture(page, "refraction-custom-invalid");
});

test("08 timeline, chart, compass, moon impact, planner and details", async ({ page }) => {
  await gotoApp(page, "interactive-analysis", viewports.desktop);
  await setDateAndAnalyze(page, "2026-07-05");
  await page.locator(".timeline-sample").first().hover();
  await capture(page, "timeline-hover-start");
  await page.locator(".timeline-sample").nth(10).hover();
  await capture(page, "timeline-hover-middle");
  await page.locator(".timeline-sample").nth(10).click();
  await capture(page, "timeline-click-focus");
  await capture(page, "timeline-no-window");
  await page.locator(".altitude-chart").hover({ position: { x: 120, y: 120 } });
  await capture(page, "chart-hover");
  await page.locator(".altitude-chart").click({ position: { x: 240, y: 140 } });
  await capture(page, "chart-focus");
  await capture(page, "chart-no-astro-night");
  await capture(page, "compass-below-horizon");
  await capture(page, "moon-impact-low");

  await setDateAndAnalyze(page, "2026-12-15");
  await capture(page, "timeline-with-window");
  await capture(page, "compass-sun-visible");
  await capture(page, "compass-moon-visible");
  await capture(page, "moon-impact-medium");

  await page.getByRole("tab", { name: /multiple|mehrere/i }).click();
  await page.getByRole("button", { name: /3 days|3 tage/i }).click();
  await capture(page, "multi-3");
  await page.getByRole("button", { name: /7 days|7 tage/i }).click();
  await capture(page, "multi-7");
  await page.getByRole("button", { name: /14 days|14 tage/i }).click();
  await capture(page, "multi-14");
  await page.getByRole("button", { name: /30 days|30 tage/i }).click();
  await capture(page, "multi-30");
  await page.locator(".planner-row").nth(1).click();
  await capture(page, "multi-click-night");

  await page.locator(".detail-report").scrollIntoViewIfNeeded();
  await capture(page, "detail-closed");
  await page.getByText(/events|ereignisse/i).first().click().catch(() => undefined);
  await capture(page, "detail-event-log");
  await page.getByText(/current sun|aktuelle sonnen/i).first().click();
  await capture(page, "detail-sun-position");
  await page.getByText(/current moon|aktuelle mond/i).first().click();
  await capture(page, "detail-moon-position");
  await page.getByText(/solar phases|sonnenphasen/i).first().click();
  await capture(page, "detail-solar-phases");
});

test("09 data grid, filters and exports", async ({ page }) => {
  await gotoApp(page, "data-grid-export", viewports.desktop);
  const grid = page.locator(".result-data-grid-panel");
  await grid.scrollIntoViewIfNeeded();
  await capture(page, "grid-all");
  await chooseGridBodyFilter(page, grid, 1);
  await capture(page, "grid-sun");
  await chooseGridBodyFilter(page, grid, 2);
  await capture(page, "grid-moon");
  await chooseGridBodyFilter(page, grid, 0);
  await grid.getByLabel(/filter rows|zeilen filtern/i).fill("2026");
  await capture(page, "grid-search");
  await grid.getByLabel(/filter rows|zeilen filtern/i).fill("definitely-no-result");
  await capture(page, "grid-no-results");
  await capture(page, "grid-sort-altitude");
  await capture(page, "export-panel");

  for (const [label, fileName] of [
    [/^csv$/i, "export-csv"],
    [/^xlsx$/i, "export-xlsx"],
    [/^txt$/i, "export-txt"],
    [/markdown/i, "export-markdown"]
  ] as const) {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: label }).click()
    ]);
    const downloadPath = await download.path();
    const size = downloadPath ? fs.statSync(downloadPath).size : 0;
    note("exports", `${fileName}: ${download.suggestedFilename()} size=${size}`);
  }
});

test("10 responsive and keyboard states", async ({ page }) => {
  await gotoApp(page, "responsive-large-desktop", viewports.largeDesktop);
  await capture(page, "responsive-large-desktop");
  await gotoApp(page, "responsive-desktop", viewports.desktop);
  await capture(page, "responsive-desktop");
  await gotoApp(page, "responsive-tablet", viewports.tablet);
  await capture(page, "responsive-tablet");
  await gotoApp(page, "responsive-mobile-top", viewports.mobile);
  await capture(page, "responsive-mobile-top");
  await page.locator(".control-location").getByRole("button", { name: /change|aendern|ändern/i }).click();
  await capture(page, "responsive-mobile-control-open");

  await page.keyboard.press("Tab");
  await capture(page, "keyboard-focus-control");
  await page.locator(".timeline-sample").first().focus();
  await capture(page, "keyboard-focus-timeline");
  await page.locator(".result-data-grid-panel").scrollIntoViewIfNeeded();
  await page.locator(".result-data-grid-panel").getByLabel(/filter rows|zeilen filtern/i).focus();
  await capture(page, "keyboard-focus-grid");
});
