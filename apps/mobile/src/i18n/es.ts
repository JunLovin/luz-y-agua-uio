const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const es = {
  appName: "Luz y Agua UIO",
  tagline: "Avisos de cortes de luz y agua en tu barrio de Quito.",
  independence: "App independiente, no afiliada a la EEQ ni a Epmaps.",
  services: { luz: "Luz", agua: "Agua" },
  common: {
    continue: "Continuar",
    cancel: "Cancelar",
    save: "Guardar",
    delete: "Borrar",
    retry: "Reintentar",
  },
  city: {
    loading: "Descargando los cortes de Quito…",
    error: "No se pudieron descargar los datos. Revisa tu conexión.",
    offline: "Sin conexión: mostrando los últimos datos descargados.",
    summary: (barrios: number, outages: number) =>
      `${plural(barrios, "barrio", "barrios")} · ${plural(outages, "corte activo", "cortes activos")}`,
  },
  welcome: {
    stepLabel: (step: number, total: number) => `Paso ${step} de ${total}`,
    privacyMissing:
      "La política de privacidad no está disponible en esta versión.",
    steps: [
      {
        title: "Avisos de cortes en tu barrio",
        body: "Te avisamos de los cortes de luz y agua programados en Quito y de lo que reportan tus vecinos.",
      },
      {
        title: "¿Tienes 15 años o más?",
        body: "La app es para personas de 15 años o más.",
        confirm: "Sí, tengo 15 años o más",
      },
      {
        title: "Tu privacidad",
        body: "No pedimos cuenta, nombre ni teléfono. Tu ubicación y tus lugares se quedan en tu teléfono: al servidor solo llega el código de tu barrio cuando reportas un corte.",
        link: "Leer la política de privacidad",
        confirm: "Acepto la política de privacidad",
      },
    ],
  },
  notifications: {
    title: "Activa los avisos",
    body: "Te avisaremos cuando se publique un corte en tus barrios y un rato antes de que empiece. No necesitamos saber quién eres: los avisos llegan por barrio.",
    allow: "Activar avisos",
    disable: "Desactivar avisos",
    later: "Ahora no",
    on: "Los avisos están activados.",
    off: "Los avisos están desactivados. Actívalos para enterarte de los cortes en tus lugares.",
  },
  format: {
    openEnded: "en adelante",
  },
  places: {
    title: "Mis lugares",
    empty:
      "Todavía no tienes lugares. Agrega tu casa o tu trabajo para recibir avisos.",
    add: "Agregar lugar",
    settings: "Ajustes",
    clear: "Sin cortes anunciados",
    ongoing: (service: string) => `Corte de ${service.toLowerCase()} en curso`,
    scheduled: (service: string, when: string) =>
      `Corte de ${service.toLowerCase()}: ${when}`,
    crowd: (service: string) =>
      `Vecinos reportan corte de ${service.toLowerCase()}`,
  },
  addPlace: {
    title: "Agregar lugar",
    useLocation: "Usar mi ubicación",
    pickOnMap: "Elegir en el mapa",
    pickOnMapHint: "Toca tu barrio en el mapa.",
    searchLabel: "O busca tu barrio por nombre",
    searchPlaceholder: "Ej.: Solanda, Cumbayá",
    noResults: "No encontramos ese barrio.",
    locationTitle: "Usar tu ubicación una sola vez",
    locationBody:
      "La usamos solo para encontrar tu barrio en este momento. Tu ubicación nunca sale del teléfono y no la seguimos en segundo plano.",
    locationDenied:
      "No diste permiso de ubicación. Puedes buscar tu barrio por nombre.",
    locationError:
      "No pudimos obtener tu ubicación. Busca tu barrio por nombre.",
    outsideQuito:
      "Tu ubicación está fuera de los barrios de Quito que conocemos.",
    barriosMissing:
      "Todavía no se descargaron los barrios. Revisa tu conexión.",
    found: (barrio: string) => `Tu lugar está en ${barrio}.`,
    aliasLabel: "Nombre del lugar",
    aliasPlaceholder: "Casa, Trabajo…",
  },
  place: {
    upcoming: "Próximos cortes",
    none: "No hay cortes anunciados para este barrio.",
    unconfirmed: "Sin confirmar",
    source: (label: string) => `Fuente: ${label}`,
    neighbors: "Reportes de vecinos",
    neighborsNone: "Nadie reporta cortes en este momento.",
    neighborsCount: (service: string, reports: number) =>
      `${service}: ${plural(reports, "vecino reporta", "vecinos reportan")} corte`,
    report: {
      title: "¿Se fue o volvió el servicio?",
      outLuz: "Se fue la luz",
      backLuz: "Volvió la luz",
      outAgua: "Se fue el agua",
      backAgua: "Volvió el agua",
      confirmTitle: "¿Enviar reporte?",
      confirm: (what: string, barrio: string) =>
        `${what} en ${barrio}. Es anónimo: solo enviamos el barrio, el servicio y si se fue o volvió.`,
      send: "Enviar",
      sending: "Enviando…",
      sent: "Gracias. Tu reporte se suma al de tus vecinos.",
      cooldown: (minutes: number) =>
        `Ya reportaste hace poco. Puedes volver a reportar en ${plural(minutes, "minuto", "minutos")}.`,
      rateLimited: "Hay demasiados reportes desde tu red. Intenta más tarde.",
      error: "No se pudo enviar el reporte. Revisa tu conexión.",
    },
    precision: {
      title: "Precisión de luz (opcional)",
      body: "Si tienes tu planilla de luz, consulta tu sector en la página de la EEQ y elígelo aquí. No guardamos tu número de suministro.",
      open: "Consultar mi sector en la EEQ",
      choose: "Elegir mi sector",
      current: (name: string) => `Tu sector: ${name}`,
      clear: "Quitar mi sector",
      search: "Busca tu sector",
      loading: "Cargando los sectores…",
      error: "No se pudo descargar la lista de sectores.",
      empty: "Todavía no hay sectores de la EEQ disponibles.",
    },
    remove: "Borrar este lugar",
    removeConfirm: "¿Borrar este lugar? Dejarás de recibir sus avisos.",
  },
  map: {
    title: "Mapa en vivo",
    open: "Ver el mapa",
    attribution: "© colaboradores de OpenStreetMap",
    unavailable: "El mapa no está disponible. Revisa tu conexión.",
    legend: {
      high: "Corte anunciado",
      medium: "Sin confirmar",
      crowd: "Vecinos reportan",
    },
  },
  settings: {
    title: "Ajustes",
    notifications: "Avisos",
    theme: "Apariencia",
    themes: { dark: "Oscuro", light: "Claro", system: "Automático" },
    quietHours: "Horario silencioso",
    quietHoursBody:
      "Entre las 22:00 y las 06:00 no enviamos avisos anticipados; los dejamos para las 06:00. Los avisos de un corte inminente sí llegan.",
    privacy: "Política de privacidad",
    code: "Código abierto en GitHub",
    version: (version: string) => `Versión ${version}`,
    wipe: "Borrar todos mis datos",
    wipeConfirm:
      "Se borrarán tus lugares y dejarás de recibir avisos. Esta acción no se puede deshacer.",
  },
} as const;
