// thresholds.js — domain logic for Artiglio
export function computeMaxSospiri(livello, des) {
  const l = Number(livello) || 1;
  const d = Number(des) || 1;
  if (l >= 17) return Infinity;
  if (l >= 9) return d + Math.floor(l / 2);
  if (l >= 5) return d + 2;
  return d;
}

export const BEACON = [
  { min: 0, max: 0, lv: 'Silente', tcol: '#6a6762', bg: '#1c1a17', d: "L'Artiglio è freddo. Nessuna entità percepisce il gruppo." },
  { min: 1, max: 2, lv: 'Tepore', tcol: '#7ab8f0', bg: '#0a1f36', d: "Entità planari entro 1 miglio sentono una direzione vaga. Non sanno cosa stanno cercando." },
  { min: 3, max: 4, lv: 'Pulsante', tcol: '#f5c06a', bg: '#2d1a05', d: "+2 circostanza ai cacciatori planari. I Marut e i Cavalieri di Kas entro 10 miglia sanno che qualcuno porta le Reliquie di Vecna." },
  { min: 5, max: 999, lv: 'Ardente', tcol: '#f09595', bg: '#2a0f0f', d: "Locate (5°, raggio 1 miglio) attivo passivamente. I Servitori di Vecna conoscono la direzione esatta. I Marut possono intercettare." }
];

export function beaconFor(sospiri) {
  return BEACON.find(x => sospiri >= x.min && sospiri <= x.max) || BEACON[BEACON.length - 1];
}
