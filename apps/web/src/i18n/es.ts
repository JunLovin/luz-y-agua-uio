const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const es = {
  appName: "Luz y Agua UIO",
  tagline: "Avisos de cortes de luz y agua en tu barrio de Quito.",
  independence: "App independiente, no afiliada a la EEQ ni a Epmaps.",
  layout: {
    skip: "Saltar al contenido",
    nav: { luz: "Luz hoy", agua: "Agua hoy" },
    legal: { privacy: "Privacidad", terms: "Términos", about: "Acerca" },
    sources:
      "Información de fuentes oficiales públicas y reportes anónimos de vecinos. Puede contener errores: ante una emergencia, llama al 911.",
  },
  services: { luz: "luz", agua: "agua" },
  serviceTitles: { luz: "Luz", agua: "Agua" },
  home: {
    summary: (luz: number, agua: number) =>
      `Hoy hay ${plural(luz, "corte de luz", "cortes de luz")} y ${plural(agua, "corte de agua", "cortes de agua")} anunciados en Quito.`,
    crowd: (barrios: number) =>
      `Vecinos reportan cortes en ${plural(barrios, "barrio", "barrios")} en este momento.`,
    seeLuz: "Ver los cortes de luz de hoy",
    seeAgua: "Ver los cortes de agua de hoy",
    appTitle: "La app",
    appBody:
      "Guarda tu casa o tu trabajo y recibe un aviso cuando se anuncie un corte en tu barrio. Sin cuentas: tu ubicación nunca sale del teléfono.",
    soon: "Próximamente en Android y iPhone.",
  },
  today: {
    title: (service: string) => `Cortes de ${service} en Quito hoy`,
    description: (service: string) =>
      `Lista de los cortes de ${service} anunciados hoy en Quito, por barrio, con su horario y su fuente.`,
    date: (date: string) => `Hoy, ${date}`,
    none: (service: string) =>
      `No hay cortes de ${service} anunciados para hoy en Quito.`,
    updated: (time: string) => `Actualizado a las ${time}.`,
    eventName: (service: string, barrio: string) =>
      `Corte de ${service} en ${barrio}`,
  },
  outage: {
    unconfirmed: "Sin confirmar",
    source: (label: string) => `Fuente: ${label}`,
  },
  barrio: {
    title: (name: string) => `Cortes de luz y agua en ${name}`,
    description: (name: string) =>
      `Cortes de luz y agua anunciados en ${name}, Quito, y lo que reportan sus vecinos.`,
    upcoming: "Cortes anunciados",
    none: "No hay cortes anunciados para este barrio.",
    neighbors: "Reportes de vecinos",
    neighborsNone: "Nadie reporta cortes en este momento.",
    neighborsCount: (service: string, reports: number) =>
      `Corte de ${service}: ${plural(reports, "vecino lo reporta", "vecinos lo reportan")}.`,
  },
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
