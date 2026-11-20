// Il ripiego di una copertina di volume (vedi `copertineVolumi.js`). Senza dipendenze, così
// `scripts/controlla-copertine-volumi.mjs` lo prova senza il resto del sito.

/**
 * Vero se di questa serie si conoscono già le copertine di qualche volume.
 * Pura: si prova senza rete.
 */
export function serieConCopertine(fonte, idSerie) {
  const volumi = fonte?.copertine?.[String(idSerie)];

  return Boolean(volumi) && Object.keys(volumi).length > 0;
}

/**
 * Cosa mostrare quando il volume non ha la sua copertina: la copertina della serie
 * solo se della serie non si sa ancora niente (vedi in cima), altrimenti niente.
 * Pura: si prova senza rete.
 */
export function ripiegoDelVolume(fonte, idSerie, ripiego = null) {
  return serieConCopertine(fonte, idSerie) ? null : ripiego;
}
