import { es } from "@/i18n/es";
import type { DayOutage } from "@/domain/today";

export function OutageItem({ outage }: { outage: DayOutage }) {
  return (
    <div>
      <p>
        {outage.window}
        {outage.tier === "medium" && (
          <>
            {" "}
            <span className="tag">{es.outage.unconfirmed}</span>
          </>
        )}
      </p>
      {outage.notes && <p>{outage.notes}</p>}
      <p className="muted">{es.outage.source(outage.sourceLabel)}</p>
    </div>
  );
}
