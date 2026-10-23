/** Absolute base for the sitemap and robots; set NEXT_PUBLIC_SITE_URL on Vercel. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
