import type { NamedPlace } from "./names.js";

/**
 * Places the EEQ also serves outside the Distrito Metropolitano de Quito. A row whose
 * zone is one of them is rejected, so a sector name shared with a Quito parroquia
 * ("San Juan" in Sangolquí) is never published for Quito. Rumipamba is left out: it is
 * also a Quito parroquia.
 */
export const OUTSIDE_QUITO: NamedPlace[] = [
  "Rumiñahui",
  "Sangolquí",
  "San Rafael",
  "San Pedro de Taboada",
  "Cotogchoa",
  "Mejía",
  "Machachi",
  "Alóag",
  "Aloasí",
  "Tambillo",
  "Uyumbicho",
  "Cutuglahua",
  "El Chaupi",
  "Tandapi",
  "Cayambe",
  "Pedro Moncayo",
  "Tabacundo",
  "San Miguel de los Bancos",
  "Los Bancos",
  "Pedro Vicente Maldonado",
  "Puerto Quito",
].map((name) => ({ id: name, names: [name] }));
