import { config } from "@luz-y-agua/shared";
import { es } from "@/i18n/es";

type LegalText = {
  title: string;
  intro: string;
  sections: readonly { title: string; items: readonly string[] }[];
};

const versionDate = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(config.legal.privacyDate));

export function LegalPage({
  text,
  versioned = false,
}: {
  text: LegalText;
  versioned?: boolean;
}) {
  return (
    <article className="legal">
      <h1>{text.title}</h1>
      {versioned && (
        <p className="muted">
          {es.legal.version(config.legal.privacyVersion, versionDate)}
        </p>
      )}
      <p className="draft">{es.legal.draft}</p>
      <p>{text.intro}</p>
      {text.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.items.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
