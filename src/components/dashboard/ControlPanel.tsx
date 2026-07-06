import { useState } from "react";
import type { CalculationFormState, GeocodingResult, Language, RefractionMode, SavedLocation, TargetBody } from "../../types";
import type { TranslationKey, Translator } from "../../i18n";
import type { ImagingMode } from "../../domain/insights/effectiveImagingWindow";
import type { AnalysisMode, RangePreset } from "../AstroDashboard";
import { RetroButton } from "../retro/RetroButton";
import { RetroFieldset } from "../retro/RetroFieldset";
import { RetroInput } from "../retro/RetroInput";
import { RetroSelect } from "../retro/RetroSelect";
import { RetroTabs } from "../retro/RetroTabs";

interface ControlPanelProps {
  form: CalculationFormState;
  analysisMode: AnalysisMode;
  imagingMode: ImagingMode;
  rangePreset: RangePreset;
  timeZones: string[];
  searchQuery: string;
  searchResults: GeocodingResult[];
  geocodingDiagnostic: {
    title: string;
    requestUrl?: string;
    errorName?: string;
    errorMessage?: string;
    timestamp?: string;
    hint: string;
  } | null;
  savedLocations: SavedLocation[];
  saveLocationName: string;
  isSearching: boolean;
  locationAccuracy: number | null;
  messages: string[];
  onUpdateForm: (partial: Partial<CalculationFormState>) => void;
  onUpdateManualLocation: (partial: Partial<CalculationFormState>) => void;
  onAnalysisMode: (mode: AnalysisMode) => void;
  onNightDate: (date: string) => void;
  onRangePreset: (preset: RangePreset) => void;
  onImagingMode: (mode: ImagingMode) => void;
  onSearchQuery: (query: string) => void;
  onSearch: () => void;
  onApplyGeocodingResult: (result: GeocodingResult) => void;
  onAutoDetect: () => void;
  onSaveLocationName: (name: string) => void;
  onSaveCurrentLocation: () => void;
  onApplySavedLocation: (location: SavedLocation) => void;
  onDeleteSavedLocation: (id: string) => void;
  onCalculate: () => void;
  t: Translator;
}

const intervalOptions = [1, 5, 10, 15, 30, 60];

function countryOptions() {
  return ["", "DE", "US", "GB", "AU", "FR", "ES", "IT", "NL", "AT", "CH"];
}

function modeTabs(t: Translator) {
  return (["instant", "night", "multi", "custom"] as const).map((mode) => ({
    value: mode,
    label: t(`analysisMode_${mode}` as TranslationKey)
  }));
}

function locationTabs(t: Translator) {
  return (["manual", "search", "saved", "auto"] as const).map((tab) => ({
    value: tab,
    label:
      tab === "manual" ? t("manualLocation") :
        tab === "search" ? t("geocodingLocation") :
          tab === "saved" ? t("savedLocations") :
            t("automaticLocation")
  }));
}

export function ControlPanel({
  form,
  analysisMode,
  imagingMode,
  rangePreset,
  timeZones,
  searchQuery,
  searchResults,
  geocodingDiagnostic,
  savedLocations,
  saveLocationName,
  isSearching,
  locationAccuracy,
  messages,
  onUpdateForm,
  onUpdateManualLocation,
  onAnalysisMode,
  onNightDate,
  onRangePreset,
  onImagingMode,
  onSearchQuery,
  onSearch,
  onApplyGeocodingResult,
  onAutoDetect,
  onSaveLocationName,
  onSaveCurrentLocation,
  onApplySavedLocation,
  onDeleteSavedLocation,
  onCalculate,
  t
}: ControlPanelProps) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationTab, setLocationTab] = useState<"manual" | "search" | "saved" | "auto">("manual");

  return (
    <section className="compact-control-panel">
      <div className="terminal-section-title">[{t("controlPanel")}]</div>
      <RetroTabs options={modeTabs(t)} value={analysisMode} onChange={onAnalysisMode} label={t("analysisMode")} />

      <div className="control-panel-grid">
        <RetroFieldset legend={analysisMode === "instant" ? t("singleInstant") : t("nightDate")} className="control-night">
          <label>
            {t("date")}
            <RetroInput type="date" value={form.startDate} onChange={(event) => onNightDate(event.target.value)} />
          </label>
          {(analysisMode === "instant" || analysisMode === "custom") && (
            <label>
              {t("time")}
              <RetroInput type="time" value={form.startTime} onChange={(event) => onUpdateForm({ startTime: event.target.value })} />
            </label>
          )}
          <p className="compact-hint">
            {analysisMode === "instant" ? t("singleInstantHint") : `${t("oneNightSpan")}: ${form.startDate} -> ${form.endDate}`}
          </p>
        </RetroFieldset>

        <RetroFieldset legend={t("locationSection")} className="control-location">
          <div className="compact-location-display">
            <strong>{form.locationName || t("manualLocation")}</strong>
            <span>{form.latitude}, {form.longitude}</span>
            <span>{t("elevationMeters")}: {form.elevationMeters || "0"} | {form.timeZone}</span>
          </div>
          <div className="compact-action-row">
            <RetroButton type="button" onClick={() => setLocationOpen((open) => !open)}>{locationOpen ? t("close") : t("change")}</RetroButton>
            <RetroButton type="button" onClick={onAutoDetect}>{t("useGps")}</RetroButton>
          </div>
        </RetroFieldset>

        <RetroFieldset legend={t("timeZone")} className="control-timezone">
          <RetroSelect value={form.timeZone} onChange={(event) => onUpdateForm({ timeZone: event.target.value })}>
            {timeZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </RetroSelect>
        </RetroFieldset>

        <RetroFieldset legend={t("bodySection")} className="control-target">
          <RetroSelect value={form.bodySelection} onChange={(event) => onUpdateForm({ bodySelection: event.target.value as TargetBody })}>
            <option value="sun">{t("sun")}</option>
            <option value="moon">{t("moon")}</option>
            <option value="both">{t("both")}</option>
          </RetroSelect>
        </RetroFieldset>

        <RetroFieldset legend={t("imagingMode")} className="control-quality">
          <RetroSelect value={imagingMode} onChange={(event) => onImagingMode(event.target.value as ImagingMode)}>
            <option value="strict">{t("imagingMode_strict")}</option>
            <option value="balanced">{t("imagingMode_balanced")}</option>
            <option value="bright">{t("imagingMode_bright")}</option>
          </RetroSelect>
        </RetroFieldset>

        <RetroFieldset legend={t("interval")} className="control-interval">
          <RetroSelect value={form.intervalPreset} onChange={(event) => onUpdateForm({ intervalPreset: event.target.value, intervalMinutes: Number(event.target.value) || form.intervalMinutes })}>
            {intervalOptions.map((minutes) => <option key={minutes} value={String(minutes)}>{minutes} {t("minutes")}</option>)}
            <option value="custom">{t("customInterval")}</option>
          </RetroSelect>
          {form.intervalPreset === "custom" && (
            <RetroInput value={form.customIntervalMinutes} inputMode="numeric" onChange={(event) => onUpdateForm({ customIntervalMinutes: event.target.value })} />
          )}
        </RetroFieldset>

        <RetroFieldset legend={t("calculationOptions")} className="control-options">
          <label>{t("refractionMode")}<RetroSelect value={form.refractionMode} onChange={(event) => onUpdateForm({ refractionMode: event.target.value as RefractionMode })}>
            <option value="none">{t("refractionNone")}</option>
            <option value="standard">{t("refractionStandard")}</option>
            <option value="custom">{t("refractionCustom")}</option>
          </RetroSelect></label>
          {form.refractionMode === "custom" && (
            <div className="calculation-options-grid">
              <label>{t("pressureHpa")}<RetroInput value={form.pressureHpa} inputMode="decimal" onChange={(event) => onUpdateForm({ pressureHpa: event.target.value })} /></label>
              <label>{t("temperatureC")}<RetroInput value={form.temperatureC} inputMode="decimal" onChange={(event) => onUpdateForm({ temperatureC: event.target.value })} /></label>
            </div>
          )}
        </RetroFieldset>
      </div>

      {analysisMode === "multi" && (
        <div className="multi-range-row" aria-label={t("rangeExplorer")}>
          {(["3d", "7d", "14d", "30d"] as const).map((preset) => (
            <RetroButton key={preset} type="button" active={rangePreset === preset} onClick={() => onRangePreset(preset)}>
              {t(`range_${preset}` as TranslationKey)}
            </RetroButton>
          ))}
        </div>
      )}

      {analysisMode === "custom" && (
        <div className="custom-range-row">
          <label>{t("startDuration")}<RetroSelect value={form.rangeMode} onChange={(event) => onUpdateForm({ rangeMode: event.target.value as CalculationFormState["rangeMode"] })}>
            <option value="single">{t("singleInstant")}</option>
            <option value="end">{t("startEnd")}</option>
            <option value="duration">{t("startDuration")}</option>
          </RetroSelect></label>
          {form.rangeMode === "end" && (
            <>
              <label>{t("endDate")}<RetroInput type="date" value={form.endDate} onChange={(event) => onUpdateForm({ endDate: event.target.value })} /></label>
              <label>{t("endTime")}<RetroInput type="time" value={form.endTime} onChange={(event) => onUpdateForm({ endTime: event.target.value })} /></label>
            </>
          )}
          {form.rangeMode === "duration" && <label>{t("durationHours")}<RetroInput value={form.durationHours} inputMode="decimal" onChange={(event) => onUpdateForm({ durationHours: event.target.value })} /></label>}
        </div>
      )}

      {locationOpen && (
        <section className="location-editor">
          <RetroTabs options={locationTabs(t)} value={locationTab} onChange={setLocationTab} label={t("locationSection")} />
          {locationTab === "manual" && (
            <div className="location-manual-grid">
              <label className="full-width">{t("locationName")}<RetroInput value={form.locationName} onChange={(event) => onUpdateManualLocation({ locationName: event.target.value })} /></label>
              <label>{t("latitude")}<RetroInput value={form.latitude} inputMode="decimal" onChange={(event) => onUpdateManualLocation({ latitude: event.target.value })} /></label>
              <label>{t("longitude")}<RetroInput value={form.longitude} inputMode="decimal" onChange={(event) => onUpdateManualLocation({ longitude: event.target.value })} /></label>
              <label>{t("elevationMeters")}<RetroInput value={form.elevationMeters} inputMode="decimal" onChange={(event) => onUpdateManualLocation({ elevationMeters: event.target.value })} /></label>
            </div>
          )}
          {locationTab === "search" && (
            <div className="location-search-panel">
              <label>{t("locationSearch")}
                <div className="search-row">
                  <RetroInput value={searchQuery} placeholder={t("searchPlaceholder")} onChange={(event) => onSearchQuery(event.target.value)} />
                  <RetroButton type="button" onClick={onSearch} disabled={isSearching}>{isSearching ? t("searching") : t("search")}</RetroButton>
                </div>
              </label>
              <label>{t("searchCountry")}
                <RetroSelect value={form.searchCountryCode} onChange={(event) => onUpdateForm({ searchCountryCode: event.target.value })}>
                  {countryOptions().map((country) => <option key={country || "any"} value={country}>{country || t("countryAny")}</option>)}
                </RetroSelect>
              </label>
              <p className="hint">{t("geocodingNotice")}</p>
              {geocodingDiagnostic && (
                <div className="geocoding-diagnostic">
                  <strong>{geocodingDiagnostic.title}</strong>
                  {geocodingDiagnostic.requestUrl && (
                    <a href={geocodingDiagnostic.requestUrl} target="_blank" rel="noreferrer">{t("openApiTestUrl")}</a>
                  )}
                  {geocodingDiagnostic.requestUrl && <small>{t("requestUrl")}: {geocodingDiagnostic.requestUrl}</small>}
                  {geocodingDiagnostic.errorName && <small>{t("browserErrorName")}: {geocodingDiagnostic.errorName}</small>}
                  {geocodingDiagnostic.errorMessage && <small>{t("browserErrorMessage")}: {geocodingDiagnostic.errorMessage}</small>}
                  {geocodingDiagnostic.timestamp && <small>{t("timestamp")}: {geocodingDiagnostic.timestamp}</small>}
                  <small>{geocodingDiagnostic.hint}</small>
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="search-results terminal-result-list">
                  {searchResults.map((result) => (
                    <article key={result.id}>
                      <div>
                        <strong>{result.name}</strong>
                        <span>{result.postcodes?.join(", ") || ""}</span>
                        <span>{[result.admin1, result.country].filter(Boolean).join(", ")}</span>
                        <small>{result.latitude.toFixed(6)}, {result.longitude.toFixed(6)} | {t("elevationMeters")}: {(result.elevationMeters ?? 0).toFixed(1)} | {result.timeZone ?? "-"}</small>
                        <em>{result.source === "local-fallback" ? t("sourceLocalFallback") : t("sourceOpenMeteo")}</em>
                      </div>
                      <RetroButton type="button" onClick={() => onApplyGeocodingResult(result)}>{t("useResult")}</RetroButton>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
          {locationTab === "saved" && (
            <div className="saved-location-panel">
              <p className="hint">{t("savedLocationsNotice")}</p>
              <div className="search-row">
                <RetroInput value={saveLocationName} placeholder={t("savedLocationNamePlaceholder")} onChange={(event) => onSaveLocationName(event.target.value)} />
                <RetroButton type="button" onClick={onSaveCurrentLocation}>{t("saveCurrentLocation")}</RetroButton>
              </div>
              {savedLocations.length === 0 ? <p className="empty-state">{t("noSavedLocations")}</p> : (
                <div className="saved-list compact-saved-list">
                  {savedLocations.map((location) => (
                    <article key={location.id}>
                      <div>
                        <strong>{location.name}</strong>
                        <span>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                        <small>{location.timeZone} | {t(`locationSource_${location.source}` as TranslationKey)}</small>
                      </div>
                      <div>
                        <RetroButton type="button" onClick={() => onApplySavedLocation(location)}>{t("applySavedLocation")}</RetroButton>
                        <RetroButton type="button" variant="danger" onClick={() => onDeleteSavedLocation(location.id)}>{t("deleteSavedLocation")}</RetroButton>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
          {locationTab === "auto" && (
            <div className="auto-location-panel">
              <RetroButton type="button" variant="primary" onClick={onAutoDetect}>{t("autoDetect")}</RetroButton>
              {locationAccuracy !== null && <p className="hint">{t("geolocationAccuracy")}: {locationAccuracy.toFixed(0)} {t("meters")}</p>}
            </div>
          )}
        </section>
      )}

      {messages.length > 0 && <section className="messages compact-messages" aria-live="polite">{messages.map((message, index) => <p key={`${message}-${index}`}>{message}</p>)}</section>}

      <div className="analyze-row">
        <RetroButton type="button" variant="primary" onClick={onCalculate}>{analysisMode === "instant" ? t("calculateInstant") : t("analyzeNight")}</RetroButton>
      </div>
    </section>
  );
}
