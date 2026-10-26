export type Service = "luz" | "agua";

const TOPIC_VERSION = "v1";
const FCM_TOPIC_PATTERN = /^[a-zA-Z0-9\-_.~%]+$/;

export function topicFor(
  service: Service,
  scope: "b",
  barrioId: string,
): string;
export function topicFor(service: "luz", scope: "z", zoneId: string): string;
export function topicFor(
  service: Service,
  scope: "b" | "z",
  id: string,
): string {
  if (scope === "z" && service !== "luz") {
    throw new Error(`Zone topics only exist for luz, got ${service}`);
  }
  if (!FCM_TOPIC_PATTERN.test(id)) {
    throw new Error(`Invalid topic id: "${id}"`);
  }
  return `${TOPIC_VERSION}_${service}_${scope}_${id}`;
}
