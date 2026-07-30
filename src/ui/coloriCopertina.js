import { useEffect, useState } from "react";
import { urlCopertina } from "../services/api";

/**
 * Ricava i colori del dorso dalla copertina.
 *
 * Funziona solo perché le immagini passano dal ponte del backend:
 * né AniList né AnimeClick mandano gli header CORS, e senza quelli
 * disegnare l'immagine su una canvas la rende illeggibile.
 *
 * I colori vengono tenuti in memoria per indirizzo: le stesse serie
 * compaiono in più sezioni e rifare il calcolo a ogni comparsa
 * sarebbe uno spreco.
 */

const memoria = new Map();

/** Media dei pixel di una fascia, saltando quelli quasi trasparenti. */
function mediaFascia(dati, larghezza, daRiga, aRiga) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (let y = daRiga; y < aRiga; y++) {
    for (let x = 0; x < larghezza; x++) {
      const i = (y * larghezza + x) * 4;
      if (dati[i + 3] < 128) continue;
      r += dati[i];
      g += dati[i + 1];
      b += dati[i + 2];
      n++;
    }
  }

  return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : [40, 44, 60];
}

function aHsl([r, g, b]) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;

  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Un dorso reale non è la copertina schiacciata: è più cupo e più
 * saturo, perché è cartone stampato e non carta patinata. Qui la
 * luminosità viene compressa in una fascia leggibile, così un
 * fumetto con copertina bianca non produce un dorso abbagliante
 * su cui il titolo sparirebbe.
 */
function tinteDorso(alto, basso) {
  const a = aHsl(alto);
  const b = aHsl(basso);

  const cupo = (c, verso) => {
    const l = Math.min(38, Math.max(12, c.l * 0.55 + verso));
    const s = Math.min(70, Math.max(14, c.s * 0.9 + 8));
    return `hsl(${Math.round(c.h)} ${Math.round(s)}% ${Math.round(l)}%)`;
  };

  return {
    alto: cupo(a, 6),
    basso: cupo(b, -4),
    // Il testo impresso: stessa tinta, molto più chiara
    testo: `hsl(${Math.round(a.h)} ${Math.round(Math.min(45, a.s))}% 88%)`,
    tinta: Math.round(a.h)
  };
}

/** Ripiego quando l'immagine non arriva: colore stabile dal titolo. */
function tinteDaTitolo(titolo) {
  const h = [...String(titolo || "?")].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;

  return {
    alto: `hsl(${h} 26% 26%)`,
    basso: `hsl(${h} 30% 15%)`,
    testo: `hsl(${h} 20% 88%)`,
    tinta: h,
    ripiego: true
  };
}

export default function useColoriCopertina(src, titolo) {
  const [colori, setColori] = useState(() =>
    src && memoria.has(src) ? memoria.get(src) : tinteDaTitolo(titolo)
  );

  useEffect(() => {
    if (!src) {
      setColori(tinteDaTitolo(titolo));
      return;
    }

    if (memoria.has(src)) {
      setColori(memoria.get(src));
      return;
    }

    let vivo = true;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (!vivo) return;

      try {
        const L = 16;
        const A = 24;
        const tela = document.createElement("canvas");
        tela.width = L;
        tela.height = A;

        const ctx = tela.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, L, A);

        const dati = ctx.getImageData(0, 0, L, A).data;

        const risultato = tinteDorso(
          mediaFascia(dati, L, 0, Math.floor(A / 2)),
          mediaFascia(dati, L, Math.floor(A / 2), A)
        );

        memoria.set(src, risultato);
        setColori(risultato);
      } catch {
        // Canvas sporca nonostante il ponte: resta il ripiego.
        setColori(tinteDaTitolo(titolo));
      }
    };

    img.onerror = () => {
      if (vivo) setColori(tinteDaTitolo(titolo));
    };

    img.src = urlCopertina(src);

    return () => {
      vivo = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, titolo]);

  return colori;
}
