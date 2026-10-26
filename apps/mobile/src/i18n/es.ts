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
  },
  city: {
    loading: "Descargando los cortes de Quito…",
    error: "No se pudieron descargar los datos. Revisa tu conexión.",
    offline: "Sin conexión: mostrando los últimos datos descargados.",
  },
  welcome: {
    stepLabel: (step: number, total: number) => `Paso ${step} de ${total}`,
    back: "Volver",
    privacyMissing:
      "La política de privacidad no está disponible en esta versión.",
    intro: {
      title: "Que el corte no te tome por sorpresa",
      body: "Te avisamos de los cortes de luz y agua anunciados en tu barrio de Quito y de lo que reportan tus vecinos.",
    },
    age: {
      title: "¿Tienes 15 años o más?",
      body: "La app es para personas de 15 años o más.",
      confirm: "Sí, tengo 15 o más",
    },
    privacy: {
      title: "Tu privacidad va primero",
      points: [
        "Tu ubicación nunca sale del teléfono.",
        "Sin cuenta, sin nombre y sin número de teléfono.",
        "Los avisos llegan por barrio: nadie sabe quién los recibe.",
      ],
      link: "Leer la política de privacidad",
      confirm: "Acepto la política",
    },
  },
  notifications: {
    title: "¿Te avisamos?",
    body: "Te avisaremos cuando se publique un corte en tus barrios y un rato antes de que empiece. No necesitamos saber quién eres: los avisos llegan por barrio.",
    allow: "Activar avisos",
    later: "Ahora no",
    on: "Te avisamos de los cortes en tus lugares.",
    off: "Apagados. Actívalos para enterarte de los cortes.",
  },
  places: {
    title: "Mis lugares",
    emptyTitle: "Agrega tu primer lugar",
    emptyBody:
      "Tu casa, tu trabajo o donde viven tus papás. Te avisamos de los cortes en cada barrio.",
    add: "Agregar lugar",
    map: "Mapa",
    settings: "Ajustes",
    open: (alias: string) => `Abrir ${alias}`,
    clear: "Sin cortes anunciados",
    ongoing: (service: string) => `${service}: corte en curso`,
    scheduled: (service: string, when: string) => `${service}: ${when}`,
    crowd: (service: string) =>
      `Vecinos reportan corte de ${service.toLowerCase()}`,
    notificationsOff: {
      title: "Los avisos están apagados",
      body: "Actívalos para enterarte de los cortes sin abrir la app.",
      action: "Activar avisos",
    },
  },
  addPlace: {
    title: "Agregar lugar",
    useLocation: "Usar mi ubicación",
    useLocationHint: "Una sola vez. No sale del teléfono.",
    pickOnMap: "Elegir en el mapa",
    pickOnMapHint: "Toca tu barrio en el mapa.",
    pickOnMapSubtitle: "Toca tu barrio en el mapa de Quito.",
    searchLabel: "O busca tu barrio",
    clearSearch: "Borrar búsqueda",
    searchPlaceholder: "Solanda, Cumbayá, La Mena…",
    noResults: "No encontramos ese barrio. Prueba con otro nombre.",
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
    found: (barrio: string) => `Tu lugar está en ${barrio}`,
    aliasLabel: "¿Cómo lo llamamos?",
    aliasPlaceholder: "Casa de la abuela",
    aliasSuggestions: ["Casa", "Trabajo", "Familia"],
  },
  place: {
    now: {
      clear: "Sin cortes anunciados",
      ongoing: "Corte en curso",
      crowd: "Vecinos reportan corte",
    },
    upcoming: "Próximos cortes",
    unconfirmed: "Sin confirmar",
    source: (label: string) => `Fuente: ${label}`,
    neighbors: "Reportes de vecinos",
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
    quietHoursBody:
      "De 22:00 a 06:00 guardamos los avisos anticipados para la mañana. Los de un corte que está por empezar sí llegan.",
    privacy: "Política de privacidad",
    code: "Código abierto en GitHub",
    version: (version: string) => `Versión ${version}`,
    wipe: "Borrar todos mis datos",
    wipeConfirm:
      "Se borrarán tus lugares y dejarás de recibir avisos. Esta acción no se puede deshacer.",
  },
} as const;
