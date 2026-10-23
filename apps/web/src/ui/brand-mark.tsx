/** The app mark: a bolt and a drop on ember. Not modeled on any utility's logo. */
export function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--primary)" />
      <path d="M26 10 14 34h10l-4 20 16-28H26l6-16z" fill="var(--on-primary)" />
      <path
        d="M46 28c-5 7-8 11-8 15a8 8 0 0 0 16 0c0-4-3-8-8-15z"
        fill="var(--on-primary)"
      />
    </svg>
  );
}
