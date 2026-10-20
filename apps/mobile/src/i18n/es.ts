export const es = {
  appName: "Luz y Agua UIO",
  tagline: "Avisos de cortes de luz y agua en tu barrio de Quito.",
  independence: "App independiente, no afiliada a la EEQ ni a Epmaps.",
  city: {
    loading: "Descargando los cortes de Quito…",
    error: "No se pudieron descargar los datos. Revisa tu conexión.",
    summary: (barrios: number, outages: number) =>
      `${barrios} ${barrios === 1 ? "barrio" : "barrios"} · ${outages} ${outages === 1 ? "corte activo" : "cortes activos"}`,
    offline: "Sin conexión: mostrando los últimos datos descargados.",
  },
} as const;
