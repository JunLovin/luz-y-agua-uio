const web = process.env.EXPO_PUBLIC_WEB_URL;

export const privacyUrl = web ? `${web}/privacidad` : null;
export const sourceCodeUrl = "https://github.com/JunLovin/luz-y-agua-uio";
/** Opened in the system browser by the user; the app never reads EEQ pages (CLAUDE.md rule 6). */
export const eeqSearchUrl = "https://www.eeq.com.ec/";
