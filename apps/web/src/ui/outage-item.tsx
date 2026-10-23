import { es } from "@/i18n/es";
import type { DayOutage } from "@/domain/today";

export function OutageItem({ outage }: { outage: DayOutage }) {
  return (
    <div className="outage">
      <p className="outage-window">
        {outage.window.charAt(0).toUpperCase() + outage.window.slice(1)}
      </p>
      {outage.tier === "medium" && (
        <span className="pill">{es.outage.unconfirmed}</span>
      )}
      {outage.notes && <p>{outage.notes}</p>}
      <p className="muted">{es.outage.source(outage.sourceLabel)}</p>
    </div>
  );
}
