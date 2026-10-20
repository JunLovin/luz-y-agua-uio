import type { Notification } from "@luz-y-agua/shared";

type ServiceAccount = { client_email: string; private_key: string };

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const encodeJson = (value: unknown) =>
  base64url(new TextEncoder().encode(JSON.stringify(value)));

async function accessToken(account: ServiceAccount): Promise<string> {
  const pem = account.private_key.replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  })}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(unsigned),
    ),
  );
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64url(signature)}`,
    }),
  });
  if (!response.ok) throw new Error(`Google OAuth answered ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

/** FCM HTTP v1, addressed by topic condition only: we never hold device tokens (CLAUDE.md rule 3). */
export function fcmSender(projectId: string, account: ServiceAccount) {
  let token: Promise<string> | null = null;
  return async (notification: Notification) => {
    token ??= accessToken(account);
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            condition: notification.condition,
            notification: {
              title: notification.title,
              body: notification.body,
            },
            data: notification.data,
            android: { priority: "high" },
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`FCM answered ${response.status}`);
  };
}
