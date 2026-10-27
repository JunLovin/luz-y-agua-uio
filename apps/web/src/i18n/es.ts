/** Where people write about privacy, their data or security. */
const contact = "legal@luzyaguauio.com";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const es = {
  appName: "Luz y Agua UIO",
  tagline: "Avisos de cortes de luz y agua en tu barrio de Quito.",
  independence: "App independiente, no afiliada a la EEQ ni a Epmaps.",
  layout: {
    skip: "Saltar al contenido",
    nav: { luz: "Luz hoy", agua: "Agua hoy", map: "Mapa" },
    legal: { privacy: "Privacidad", terms: "Términos", about: "Acerca" },
    sourceCode: "Código en GitHub",
    theme: "Apariencia",
    navToday: "Cortes de hoy",
    navLegal: "Información legal",
    themes: { dark: "Oscuro", light: "Claro", auto: "Automático" },
    sources:
      "Información de fuentes oficiales públicas y reportes anónimos de vecinos. Puede contener errores: ante una emergencia, llama al 911.",
  },
  services: { luz: "luz", agua: "agua" },
  serviceTitles: { luz: "Luz", agua: "Agua" },
  home: {
    // The headline reads as one sentence; each part is its own line on screen.
    headline: {
      luzBefore: "¿Se va ",
      luz: "la luz",
      aguaBefore: "¿Se va ",
      agua: "el agua",
      after: "Entérate antes.",
    },
    live: (time: string) => `En vivo · actualizado a las ${time}`,
    lead: "Los cortes anunciados en Quito y lo que reportan tus vecinos, barrio por barrio, en un solo mapa.",
    tapHint:
      "Toca un barrio en el mapa para ver su horario y de dónde viene el aviso.",
    count: (n: number, service: string) =>
      n === 1 ? `corte de ${service} hoy` : `cortes de ${service} hoy`,
    countNone: (service: string) => `Sin cortes de ${service} hoy`,
    trust: ["Gratis", "Sin cuentas", "Tu ubicación no sale del teléfono"],
    statement: "barrios en el mapa.",
    statementAfter: "Tú solo necesitas saber del tuyo.",
    seeMap: "Abrir el mapa completo",
    seeList: "Ver la lista por barrio",
    crowd: (barrios: number) =>
      `Vecinos reportan cortes en ${plural(barrios, "barrio", "barrios")} en este momento.`,
    howTitle: "Así sabemos lo que pasa en tu barrio",
    how: {
      official: {
        title: "Lo que anuncian la EEQ y Epmaps",
        body: "Leemos sus cronogramas públicos y ubicamos cada corte en su barrio, con el horario y la fuente.",
      },
      neighbors: {
        title: "Lo que viven tus vecinos",
        body: "Cuando varios vecinos reportan que se fue la luz o el agua, su barrio se pinta de morado, aunque nadie lo haya anunciado.",
      },
      privacy: {
        title: "Lo que no sabemos de ti",
        body: "Ni tu nombre, ni tu número, ni dónde estás. La app calcula tu barrio en el teléfono y ahí se queda.",
      },
    },
    appTitle: "Guarda tu casa. Te avisamos antes del corte.",
    appBody:
      "Agrega tu casa, tu trabajo o la casa de tus papás. Recibe un aviso cuando anuncien un corte en ese barrio, y otro un rato antes de que empiece.",
    soon: "Próximamente en Android y iPhone",
  },
  preview: {
    label: "Pantallas de la app",
    pause: "Pausar las pantallas",
    play: "Reanudar las pantallas",
    shots: {
      home: "Mis lugares: tus barrios guardados y si hay un corte.",
      place: "Cada lugar: el corte de ahora, los próximos y cómo reportar.",
      map: "El mapa en vivo, también dentro de la app.",
    },
  },
  map: {
    title: "Mapa de cortes en Quito",
    description:
      "Mapa en vivo de los barrios de Quito con cortes de luz y agua anunciados y los que reportan los vecinos.",
    label: "Mapa de Quito con los barrios afectados",
    service: "Servicio",
    legendLabel: "Leyenda",
    affected: "Barrios afectados",
    legend: {
      high: "Corte anunciado",
      medium: "Sin confirmar",
      crowd: "Vecinos reportan",
    },
    summary: (n: number, service: string) =>
      n === 0
        ? `Ningún barrio con corte de ${service} ahora ni más tarde hoy.`
        : `${plural(n, "barrio", "barrios")} con corte de ${service} hoy.`,
    empty: "Hoy no hay cortes anunciados ni reportes de vecinos en Quito.",
    showExample: "Ver un ejemplo",
    example: "Ejemplo: estos no son cortes reales.",
    backToToday: "Volver a los cortes de hoy",
    exampleSource: "Ejemplo",
    loading: "Cargando el mapa…",
    unavailable:
      "No se pudo cargar el mapa. Revisa tu conexión y recarga la página.",
    openBarrio: "Ver el barrio",
    close: "Cerrar",
    clear: (service: string) => `Sin cortes de ${service} hoy.`,
    crowd: (reports: number) =>
      `${plural(reports, "vecino reporta", "vecinos reportan")} corte ahora.`,
    attribution: "© colaboradores de OpenStreetMap",
    gestures: {
      windows: "Usa Ctrl + rueda del mouse para acercar el mapa",
      mac: "Usa ⌘ + rueda del mouse para acercar el mapa",
      mobile: "Usa dos dedos para mover el mapa",
    },
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
    now: "Ahora",
    nowClear: "Sin cortes anunciados",
    nowOngoing: "Corte en curso",
    nowCrowd: "Vecinos reportan corte",
    upcoming: "Cortes anunciados",
    neighbors: "Reportes de vecinos",
    neighborsCount: (service: string, reports: number) =>
      `Corte de ${service}: ${plural(reports, "vecino lo reporta", "vecinos lo reportan")}.`,
  },
  legal: {
    draft:
      "Borrador pendiente de revisión legal. Puede cambiar antes del lanzamiento de la app.",
    version: (version: number, date: string) => `Versión ${version}, ${date}.`,
    privacy: {
      title: "Política de privacidad",
      description:
        "Qué datos usa Luz y Agua UIO, dónde se quedan y cómo ejercer tus derechos.",
      intro:
        "Luz y Agua UIO está hecha para avisarte de cortes sin saber quién eres. Esta política explica, en español claro, qué datos se usan y dónde se quedan.",
      sections: [
        {
          title: "Responsable",
          items: [
            `Mathias Rendón, persona natural, Quito, Ecuador. Contacto: ${contact}.`,
          ],
        },
        {
          title: "Lo que no pedimos",
          items: [
            "No pedimos cuenta, nombre, cédula, teléfono, correo ni número de suministro.",
          ],
        },
        {
          title: "Lo que se queda en tu teléfono",
          items: [
            "Tus lugares (el nombre que les pones, su barrio y un punto en el mapa), los temas de avisos a los que estás suscrito, la hora de tus últimos reportes y tu confirmación de edad y de esta política.",
            "Tu ubicación se usa una sola vez, con tu permiso y solo mientras usas la app, para encontrar tu barrio. Nunca sale del teléfono y no la seguimos en segundo plano.",
          ],
        },
        {
          title: "Lo que llega a nuestro servidor",
          items: [
            "Para mostrarte los cortes, la app descarga la lista completa de Quito y la filtra en tu teléfono. Nunca pide los datos de un barrio en particular.",
            "Cuando envías un reporte, llegan el barrio, el servicio (luz o agua), si se fue o volvió, y un código aleatorio que tu teléfono cambia cada día. El servidor convierte ese código con una clave que se borra a las 48 horas: así cuenta teléfonos distintos sin poder seguir a nadie de un día a otro. Los reportes se borran a los 30 días.",
            "Para frenar abusos limitamos los reportes por dirección IP. La IP solo se guarda transformada con esa misma clave diaria, y se borra a la hora.",
          ],
        },
        {
          title: "Avisos",
          items: [
            "Los avisos llegan por temas de barrio mediante Firebase Cloud Messaging, de Google. Google procesa el identificador de notificaciones de tu teléfono y sabe a qué temas de barrio está suscrito, según sus propias políticas. Nosotros no recibimos ni guardamos ese identificador.",
            "Si no activas los avisos, la app no se suscribe a ningún tema.",
          ],
        },
        {
          title: "Comprobación de la app",
          items: [
            "Para frenar reportes falsos, al enviar un reporte la app pedirá a Google (Android) o Apple (iPhone) que confirme que es la app genuina.",
          ],
        },
        {
          title: "Mapa, búsqueda y sitio web",
          items: [
            "El mapa se sirve desde nuestro propio almacenamiento, con datos de OpenStreetMap, y la búsqueda de barrios ocurre en tu teléfono. Ningún servicio de mapas de terceros ve qué zona miras.",
            "Este sitio no usa cookies, analítica, píxeles ni fuentes de terceros. La única cookie es la de la sesión del panel de administración, que solo usa el mantenedor.",
          ],
        },
        {
          title: "Proveedores",
          items: [
            "Usamos Supabase (base de datos), Vercel (sitio web) y Google (avisos). Sus servidores están fuera de Ecuador.",
            "Sus registros técnicos pueden incluir tu dirección IP por un tiempo limitado. Configuramos la retención mínima disponible.",
          ],
        },
        {
          title: "Edad",
          items: ["La app es para personas de 15 años o más."],
        },
        {
          title: "Tus derechos",
          items: [
            'Puedes borrar todo lo que guarda la app desde Ajustes → "Borrar todos mis datos". Eso también cancela tus suscripciones a los avisos.',
            `Como no guardamos datos que te identifiquen, normalmente no hay nada en el servidor que podamos asociar contigo. Aun así, para ejercer tus derechos de acceso, rectificación, eliminación, oposición o portabilidad, escribe a ${contact}.`,
            "También puedes presentar un reclamo ante la Superintendencia de Protección de Datos Personales.",
          ],
        },
        {
          title: "Seguridad",
          items: [
            "Si ocurriera una vulneración de seguridad, la notificaremos a la Superintendencia de Protección de Datos Personales en los plazos de ley y, cuando corresponda, a las personas afectadas.",
          ],
        },
        {
          title: "Cambios",
          items: [
            "Si esta política cambia, la app te pedirá aceptarla de nuevo antes de seguir.",
          ],
        },
      ],
    },
    terms: {
      title: "Términos de uso",
      description:
        "Condiciones para usar Luz y Agua UIO, una app informativa e independiente.",
      intro:
        "Al usar Luz y Agua UIO aceptas estos términos. Son cortos porque el servicio es simple y gratuito.",
      sections: [
        {
          title: "Qué es",
          items: [
            "Un servicio informativo y gratuito que reúne los cortes de luz y agua anunciados en Quito y lo que reportan los vecinos.",
            "App independiente, no afiliada a la EEQ ni a Epmaps ni al Municipio de Quito.",
          ],
        },
        {
          title: "De dónde sale la información",
          items: [
            "De publicaciones oficiales y públicas de la Empresa Eléctrica Quito y de Epmaps, y de reportes anónimos de vecinos. Cada aviso dice su fuente.",
            'Los cortes marcados "Sin confirmar" no pudieron verificarse del todo.',
          ],
        },
        {
          title: "Sin garantías",
          items: [
            "La información puede contener errores o cambiar sin aviso. Confirma con las fuentes oficiales antes de tomar decisiones importantes.",
            "No somos un servicio de emergencias. Ante una emergencia, llama al 911 o usa los canales oficiales.",
          ],
        },
        {
          title: "Uso correcto",
          items: [
            "No envíes reportes falsos, no automatices envíos y no intentes saltarte los límites del servicio.",
          ],
        },
        {
          title: "Código abierto",
          items: [
            'El código es abierto: el servidor y la web bajo la licencia AGPL-3.0, y la app bajo la licencia MIT. El nombre y el logo "Luz y Agua UIO" no están cubiertos por esas licencias.',
          ],
        },
        {
          title: "Responsabilidad",
          items: [
            "En la medida que permita la ley, no respondemos por daños derivados de decisiones tomadas con esta información.",
          ],
        },
        {
          title: "Cambios y ley aplicable",
          items: [
            "Podemos actualizar estos términos; la versión vigente está siempre en esta página. Se rigen por las leyes de Ecuador.",
            `Contacto: ${contact}.`,
          ],
        },
      ],
    },
    about: {
      title: "Acerca de Luz y Agua UIO",
      description:
        "Qué es Luz y Agua UIO, cómo funciona y por qué no está afiliada a la EEQ ni a Epmaps.",
      intro:
        "Luz y Agua UIO avisa a los quiteños de los cortes de luz y agua en su barrio: los programados, que anuncian las empresas, y los que no, que reportan los vecinos.",
      sections: [
        {
          title: "Cómo funciona",
          items: [
            "Leemos los cronogramas que publican la EEQ y Epmaps. Un modelo de inteligencia artificial los convierte en una lista de barrios y horarios, que luego se valida con reglas fijas y recibe un nivel de confianza. A ese modelo solo le llegan documentos públicos.",
            "Cuando varios vecinos de un barrio reportan que se fue el servicio, el barrio aparece en el mapa y quienes lo siguen reciben un aviso.",
            "Los avisos llegan por barrio: nadie sabe quién recibe cada aviso.",
          ],
        },
        {
          title: "Independiente",
          items: [
            "App independiente, no afiliada a la EEQ ni a Epmaps ni al Municipio de Quito. No usamos sus logos ni sus colores, y cada aviso dice de dónde sale.",
          ],
        },
        {
          title: "Datos y código abierto",
          items: [
            "Mapas y límites de barrios: © colaboradores de OpenStreetMap, con licencia ODbL.",
            "El código es abierto y está en GitHub.",
          ],
        },
        {
          title: "Contacto",
          items: [`${contact}.`],
        },
      ],
    },
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
