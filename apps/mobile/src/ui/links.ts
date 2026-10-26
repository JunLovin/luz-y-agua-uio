import { config } from "@luz-y-agua/shared";

const web = process.env.EXPO_PUBLIC_WEB_URL;

export const privacyUrl = web ? `${web}/privacidad` : null;
export const sourceCodeUrl = config.legal.sourceCodeUrl;
/** Opened in the system browser by the user; the app never reads EEQ pages (PRINCIPIOS.md rule 6). */
export const eeqSearchUrl = "https://www.eeq.com.ec/";
