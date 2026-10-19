const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const MAX_ATTEMPTS = 5;

export async function queryOverpass(query: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    let failure: string;
    try {
      const response = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
          "User-Agent": "luz-y-agua-uio-import (one-off manual import)",
        },
        body: new URLSearchParams({ data: query }),
      });
      const text = await response.text();
      if (response.ok && text.trimStart().startsWith("{"))
        return JSON.parse(text);
      failure = `${response.status} ${text.slice(0, 200)}`;
    } catch (error) {
      failure = String(error);
    }
    if (attempt === MAX_ATTEMPTS) {
      throw new Error(`Overpass failed after ${attempt} attempts: ${failure}`);
    }
    const waitMs = 2 ** attempt * 5_000;
    console.warn(
      `Overpass unavailable (${failure.slice(0, 60)}), retrying in ${waitMs / 1000}s`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}
