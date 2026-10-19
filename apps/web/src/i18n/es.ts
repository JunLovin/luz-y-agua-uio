export const es = {
  appName: "Luz y Agua UIO",
  tagline: "Avisos de cortes de luz y agua en tu barrio de Quito.",
  independence: "App independiente, no afiliada a la EEQ ni a Epmaps.",
  admin: {
    title: "Ingesta de documentos",
    loading: "Cargando…",
    email: "Correo del administrador",
    sendCode: "Enviar código",
    codeSent:
      "Si el correo es el del administrador, te llegó un código de 6 dígitos.",
    code: "Código",
    verify: "Entrar",
    invalidCode: "El código no es válido o ya venció.",
    logout: "Salir",
    source: "Fuente",
    sources: { eeq: "Empresa Eléctrica Quito (luz)", epmaps: "Epmaps (agua)" },
    file: "Archivo (PDF, imagen o texto, máximo 20 MB)",
    url: "O una URL de una fuente permitida",
    submit: "Procesar",
    missingInput: "Sube un archivo o pega una URL.",
    results: {
      extracted: "Documento procesado.",
      duplicate: "Este documento ya se procesó; no se volvió a leer.",
      failed:
        "No se pudo leer el documento. Se reintentará si lo vuelves a subir.",
      refused: "Documento rechazado.",
      forbidden: "Tu sesión venció. Vuelve a entrar.",
      error: "Ocurrió un error inesperado.",
    },
    tiers:
      "Publicados: {high} con aviso, {medium} sin confirmar, {low} guardados sin mostrar. Descartados: {rejected}.",
    refusals: {
      invalid_url: "La URL no es válida o no usa https.",
      blocked_host: "Ese sitio está bloqueado: no se descarga automáticamente.",
      not_in_allowlist: "Esa URL no está en la lista de fuentes permitidas.",
      robots_disallowed: "El robots.txt del sitio no permite descargarla.",
      unsupported_type: "Tipo de archivo no soportado.",
      too_large: "El archivo pasa de 20 MB.",
      fetch_failed: "No se pudo descargar la URL.",
      unknown_source: "Fuente desconocida.",
    },
  },
} as const;
