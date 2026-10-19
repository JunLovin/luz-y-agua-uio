import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { es } from "@/i18n/es";
import { resultMessage } from "@/admin/result-message";
import {
  getAdminToken,
  getPendingEmail,
  hasRefreshToken,
} from "@/server/admin-session";
import { logout, requestCode, verifyCode } from "./actions";

const t = es.admin;

export const metadata: Metadata = {
  title: `${t.title} · ${es.appName}`,
  robots: { index: false, follow: false },
};

type Params = Record<string, string | string[] | undefined>;

async function Panel({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  if (!(await getAdminToken())) {
    if (await hasRefreshToken()) redirect("/admin/ingesta/renovar");
    if (!(await getPendingEmail())) {
      return (
        <form action={requestCode}>
          <label>
            {t.email}{" "}
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <button type="submit">{t.sendCode}</button>
        </form>
      );
    }
    return (
      <form action={verifyCode}>
        <p>{params.error === "code" ? t.invalidCode : t.codeSent}</p>
        <label>
          {t.code}{" "}
          <input
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            autoComplete="one-time-code"
          />
        </label>
        <button type="submit">{t.verify}</button>
      </form>
    );
  }

  const notice = resultMessage(params);
  return (
    <>
      {notice && <p role="status">{notice}</p>}
      <form
        action="/admin/ingesta/subir"
        method="post"
        encType="multipart/form-data"
      >
        <label>
          {t.source}{" "}
          <select name="sourceId" required>
            {Object.entries(t.sources).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.file}{" "}
          <input
            name="file"
            type="file"
            accept="application/pdf,image/*,text/plain"
          />
        </label>
        <label>
          {t.url} <input name="url" type="url" />
        </label>
        <button type="submit">{t.submit}</button>
      </form>
      <form action={logout}>
        <button type="submit">{t.logout}</button>
      </form>
    </>
  );
}

export default function IngestPage({
  searchParams,
}: PageProps<"/admin/ingesta">) {
  return (
    <main>
      <h1>{t.title}</h1>
      <Suspense fallback={<p>{t.loading}</p>}>
        <Panel searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
