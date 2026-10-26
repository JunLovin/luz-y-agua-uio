export type Alert =
  | { kind: "low_share"; detail: { documents: number; low: number } }
  | {
      kind: "silent_source";
      detail: { source: string; lastReceivedAt: string };
    }
  | {
      kind: "failed_document";
      detail: { id: string; source: string; error: string | null };
    };

export interface AlertsRepository {
  pendingAlerts(): Promise<Alert[]>;
  markFailuresAlerted(ids: string[]): Promise<void>;
}

export interface Mailer {
  send(email: { subject: string; text: string }): Promise<void>;
}

function line(alert: Alert): string {
  switch (alert.kind) {
    case "low_share":
      return `- ${alert.detail.low} de ${alert.detail.documents} documentos de las últimas 24 h no publicaron ningún corte (high o medium).`;
    case "silent_source":
      return `- La fuente "${alert.detail.source}" no envía documentos desde ${alert.detail.lastReceivedAt}.`;
    case "failed_document":
      return `- El documento ${alert.detail.id} (${alert.detail.source}) falló tres veces: ${alert.detail.error ?? "sin detalle"}.`;
  }
}

export function formatAlerts(alerts: Alert[]): {
  subject: string;
  text: string;
} {
  return {
    subject: `Luz y Agua UIO: ${alerts.length} ${alerts.length === 1 ? "alarma" : "alarmas"} del lector de cronogramas`,
    text: ["Revisa el panel de ingesta:", "", ...alerts.map(line)].join("\n"),
  };
}

/** Sends one email with every pending alert and marks the reported failures only once it was sent. */
export async function sendAlerts(deps: {
  repository: AlertsRepository;
  mailer: Mailer;
}): Promise<number> {
  const alerts = await deps.repository.pendingAlerts();
  if (alerts.length === 0) return 0;
  await deps.mailer.send(formatAlerts(alerts));
  const failed = alerts.flatMap((alert) =>
    alert.kind === "failed_document" ? [alert.detail.id] : [],
  );
  if (failed.length > 0) await deps.repository.markFailuresAlerted(failed);
  return alerts.length;
}
