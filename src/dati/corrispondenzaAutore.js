/**
 * Chi ha scritto/disegnato cosa, in un indice che tollera la
 * romanizzazione.
 *
 * Il nome esatto non basta: lo stesso Shuzo Oshimi del nostro database
 * compare su AniList come "Shuuzou Oshimi", la stessa persona scritta
 * in un altro modo. Fuse tollera le poche lettere di differenza che la
 * romanizzazione porta con sé, un confronto `===` la perderebbe sempre.
 *
 * Nato dentro `dati/consigli.js` per escludere dai consigli quello che
 * possiedi già; riusato da `pages/DesiderioPage.jsx` per il verso
 * opposto — trovare cosa possiedi già di un certo autore.
 */

import Fuse from "fuse.js";

const normalizza = (t) => (t || "").trim().toLowerCase();

export function indiceAutori(serie) {
  const perNome = new Map();

  for (const s of serie) {
    for (const nome of [s.autore, s.disegnatore]) {
      const chiave = normalizza(nome);
      if (!chiave) continue;

      if (!perNome.has(chiave)) {
        perNome.set(chiave, { nome: nome.trim(), serie: [] });
      }

      perNome.get(chiave).serie.push(s);
    }
  }

  const fuse = new Fuse([...perNome.values()], {
    keys: ["nome"],
    threshold: 0.3,
    ignoreLocation: true
  });

  return {
    /** true se questo nome (o uno simile per romanizzazione) è fra gli autori posseduti. */
    corrisponde(nome) {
      return Boolean(nome) && fuse.search(nome).length > 0;
    },

    /** Le serie possedute dello stesso autore, senza doppioni. */
    trovaSerie(nome) {
      if (!nome) return [];

      const viste = new Set();
      const trovate = [];

      for (const r of fuse.search(nome)) {
        for (const s of r.item.serie) {
          if (!viste.has(s.id)) {
            viste.add(s.id);
            trovate.push(s);
          }
        }
      }

      return trovate;
    }
  };
}
