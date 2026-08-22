/**
 * Le immagini di profilo, prima di spedirle.
 *
 * Quello che parte verso il server non è mai il file che è stato
 * scelto: una foto di un telefono moderno pesa quattro megabyte ed è
 * larga quattromila pixel, per finire dentro un cerchio da
 * quarant'otto. Qui viene ritagliata, rimpicciolita e riscritta in
 * WebP — di solito da quattro megabyte a venti kilobyte — e solo
 * allora parte.
 *
 * Farlo nel browser e non sul server non è pigrizia: ridimensionare
 * lato server vorrebbe dire aggiungere `sharp` (un binario nativo che
 * su Render si ricompila a ogni deploy) per un lavoro che il telefono
 * fa da solo in un decimo di secondo — e vorrebbe dire far viaggiare
 * i quattro megabyte veri su una connessione mobile.
 *
 * ---------------------------------------------------------------
 * IL GIRO DELLA TELA, E PERCHÉ PASSA DA UN BLOB
 *
 * Una copertina di AnimeClick arriva dal backend, che in produzione
 * sta su un altro dominio. Disegnare su una tela un'immagine di un
 * altro dominio la «sporca» (tainted), e da una tela sporca non si
 * può più tirare fuori niente: `toBlob` solleva un errore di
 * sicurezza. Il rimedio non è `crossOrigin` — che funziona ma dipende
 * dalle intestazioni che il server manda quel giorno — ma prendere
 * prima i byte con `fetch` e trasformarli in un indirizzo `blob:`,
 * che è dello stesso dominio della pagina per definizione.
 */

/** Le misure. Stanno qui e non sparse nei componenti. */
export const MISURE = {
  // Tonda, quindi quadrata: 512 basta anche per uno schermo che
  // raddoppia i pixel, e per un cerchio da 92.
  faccia: { larghezza: 512, altezza: 512 },
  // Larga e bassa, il rapporto di una fascia. 1600 copre uno schermo
  // grande senza arrivare a pesare come una fotografia.
  striscione: { larghezza: 1600, altezza: 500 }
};

/**
 * Da file (o indirizzo) a immagine disegnabile.
 *
 * `URL.createObjectURL` va revocato: ogni indirizzo `blob:` tiene in
 * vita i byte finché la scheda è aperta, e chi prova dieci copertine
 * di fila si porterebbe dietro dieci immagini intere.
 */
async function apri(sorgente) {
  const blob =
    sorgente instanceof Blob ? sorgente : await fetch(sorgente).then((r) => r.blob());

  const indirizzo = URL.createObjectURL(blob);

  try {
    return await new Promise((risolvi, rifiuta) => {
      const immagine = new Image();

      immagine.onload = () => risolvi(immagine);
      immagine.onerror = () => rifiuta(new Error("Non riesco ad aprire questa immagine"));
      immagine.src = indirizzo;
    });
  } finally {
    URL.revokeObjectURL(indirizzo);
  }
}

/**
 * Ritaglia al centro e riduce.
 *
 * Il ritaglio è «cover»: l'immagine riempie tutto il riquadro e quello
 * che avanza esce fuori, invece di lasciare bande vuote ai lati. Su
 * una faccia è quasi sempre la scelta giusta — chi carica una foto
 * verticale si aspetta di vederci dentro la faccia, non la faccia in
 * mezzo a due strisce bianche.
 */
export async function riduci(sorgente, { larghezza, altezza, qualita = 0.82 }) {
  const immagine = await apri(sorgente);

  const tela = document.createElement("canvas");
  tela.width = larghezza;
  tela.height = altezza;

  const pennello = tela.getContext("2d");

  // Il riquadro da ritagliare dentro l'originale: il più grande che
  // abbia le proporzioni giuste, centrato.
  const scala = Math.max(larghezza / immagine.width, altezza / immagine.height);
  const larghezzaUsata = larghezza / scala;
  const altezzaUsata = altezza / scala;

  pennello.drawImage(
    immagine,
    (immagine.width - larghezzaUsata) / 2,
    (immagine.height - altezzaUsata) / 2,
    larghezzaUsata,
    altezzaUsata,
    0,
    0,
    larghezza,
    altezza
  );

  // WebP quando c'è, JPEG quando no. `toBlob` con un tipo che il
  // browser non sa scrivere non fallisce: restituisce un PNG con
  // l'aria di aver funzionato, e un PNG di un ritratto pesa cinque
  // volte tanto. Per questo si guarda il tipo che torna, non quello
  // che si è chiesto.
  const webp = await inBlob(tela, "image/webp", qualita);

  const finale =
    webp && webp.type === "image/webp" ? webp : await inBlob(tela, "image/jpeg", qualita);

  if (!finale) throw new Error("Non riesco a convertire questa immagine");

  return inDataUri(finale);
}

function inBlob(tela, tipo, qualita) {
  return new Promise((risolvi) => tela.toBlob(risolvi, tipo, qualita));
}

function inDataUri(blob) {
  return new Promise((risolvi, rifiuta) => {
    const lettore = new FileReader();

    lettore.onload = () => risolvi(lettore.result);
    lettore.onerror = () => rifiuta(new Error("Non riesco a leggere l'immagine"));
    lettore.readAsDataURL(blob);
  });
}

/** Quanto pesa un data URI, in kilobyte: serve solo a dirlo a schermo. */
export function pesoDi(dataUri) {
  const base64 = String(dataUri).split(",")[1] || "";

  return Math.round((base64.length * 3) / 4 / 1024);
}
