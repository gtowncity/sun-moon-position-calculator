import type { EventResult } from "../../types";
import type { Translator } from "../../i18n";
import { formatEventKind } from "../../lib/export/columns";
import { eventKey } from "./utils";

interface EventLogProps {
  events: EventResult[];
  onFocusUtc: (utcTime: string | null) => void;
  t: Translator;
}

export function EventLog({ events, onFocusUtc, t }: EventLogProps) {
  const visibleEvents = events
    .filter((event) => event.status === "found")
    .sort((a, b) => String(a.utcTime ?? "").localeCompare(String(b.utcTime ?? "")));

  if (visibleEvents.length === 0) {
    return <p className="empty-state">{t("noEvent")}</p>;
  }

  return (
    <div className="event-log">
      {visibleEvents.map((event, index) => (
        <button type="button" key={eventKey(event, index)} onClick={() => onFocusUtc(event.utcTime)} disabled={!event.utcTime}>
          <span>{event.localTime?.slice(0, 5) ?? "--:--"}</span>
          <strong>{event.body === "sun" ? t("sun") : t("moon")}</strong>
          <em>{formatEventKind(event.kind, t)}</em>
        </button>
      ))}
    </div>
  );
}
