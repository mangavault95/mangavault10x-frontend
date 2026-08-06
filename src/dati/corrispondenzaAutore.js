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

/**
 * Due nomi che sono la stessa persona scritta in due modi.
 *
 * Il confronto a testo — anche largo, con `includes` — non basta:
 * "Shuzo Oshimi" e "Shuuzou Oshimi" non si contengono a vicenda, e
 * quel niente di differenza è bastato a lungo per far scambiare "I
 * fiori del male" con un manhwa coreano omonimo. Stessa tolleranza
 * dell'indice qui sotto, ma per un confronto singolo: chi ha due nomi
 * in mano e deve solo sapere se sono la stessa mano.
 */
export function stessoAutore(uno, altro) {
  const a = normalizza(uno);
  const b = normalizza(altro);

  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;

  const fuse = new Fuse([{ nome: a }], { keys: ["nome"], threshold: 0.3, ignoreLocation: true });

  return fuse.search(b).length > 0;
}

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
