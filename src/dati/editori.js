import { editoreCanonico, idDa } from "./generi";

/**
 * I marchi delle case editrici.
 *
 * Non c'è nessuna colonna `logo` nel database, e non serve: gli editori
 * sono una dozzina e cambiano una volta ogni mai. Stanno come file
 * dentro `assets/editori/`, e **il nome del file è la chiave**.
 *
 * Aggiungerne uno vuol dire lasciarlo cadere lì dentro: non si tocca
 * questo file, non si tocca il database, e al ricaricamento compare.
 * `import.meta.glob` li raccoglie in fase di build, quindi finiscono
 * nel bundle con l'hash giusto e non c'è nessuna richiesta a runtime
 * che possa mancare il bersaglio.
 *
 * Il nome giusto lo dà `idDa(editoreCanonico(...))` — cioè la stessa
 * regola con cui gli editori finiscono nell'indirizzo dei filtri:
 * `Panini` → `panini.svg`, `J-POP` → `j-pop.svg`, `Star Comics` →
 * `star-comics.png`, `Edizioni BD` → `edizioni-bd.svg`. Passare di lì
 * invece di confrontare i nomi grezzi significa che "Panini S.p.A." e
 * "Panini" trovano lo stesso file, e che il giorno che quella
 * normalizzazione cambia, cambia in un posto solo.
 *
 * Chi non ha un file non resta scoperto: passata a `Copertina` come
 * `src`, un editore senza logo prende lo stesso ripiego a iniziali di
 * una serie senza copertina — non serve un secondo meccanismo.
 */
const FILE = import.meta.glob("../assets/editori/*.{svg,png,webp,jpg,jpeg}", {
  eager: true,
  import: "default"
});

const MARCHI = Object.fromEntries(
  Object.entries(FILE).map(([percorso, url]) => [
    percorso
      .split("/")
      .pop()
      .replace(/\.[^.]+$/, "")
      .toLowerCase(),
    url
  ])
);

/** L'immagine del marchio, o `null` se quell'editore non ce l'ha. */
export function marchioEditore(nome) {
  const canonico = editoreCanonico(nome);

  return canonico ? MARCHI[idDa(canonico)] || null : null;
}
