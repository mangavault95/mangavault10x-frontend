import { coloreLettore } from "../../dati/lettori";
import { urlFaccia } from "../../services/api";

/**
 * La faccia di una persona: un cerchio.
 *
 * Prima era un esagono con dentro l'iniziale, e aveva una sua logica
 * — nessuno aveva una foto, e il cerchio con la lettera dentro è il
 * ripiego di ogni applicazione esistente. Ma il ripiego era diventato
 * la regola: una pagina personale con in cima un'iniziale non è la
 * pagina di qualcuno, è un segnaposto. Adesso che l'immagine si può
 * mettere, la forma torna quella che tutti riconoscono come «foto
 * profilo», e l'iniziale resta per chi non ne ha ancora messa una.
 *
 * IL COLORE NON SE N'È ANDATO. È lo stesso di `utenti.colore`
 * (migrazione 012), quello che distingue le note in biblioteca: fa da
 * fondo a chi ha solo l'iniziale e da anello a chi ha la foto. Serve
 * perché in un feed dove tutti scrivono, riconoscere chi parla prima
 * di leggere il nome è quello che rende la pagina scorrevole — e una
 * fila di ritratti piccoli si distingue molto peggio di una fila di
 * colori.
 *
 * ⚠️ Le classi Tailwind restano scritte per intero in `dati/lettori.js`
 * e non composte a pezzi: una classe formata unendo stringhe non
 * finisce mai nel CSS prodotto, e il tondino uscirebbe trasparente.
 */

export default function Tondino({
  utente,
  nickname,
  colore,
  faccia,
  dimensione = 40,
  anello = false,
  className = ""
}) {
  // Si può passare la persona intera o i suoi pezzi: nel feed arriva
  // già un oggetto `utente`, altrove ci sono solo il nome e il colore.
  const nome = utente?.nickname ?? nickname ?? "";
  const tinta = coloreLettore(utente?.colore ?? colore);
  const quando = utente?.faccia ?? faccia ?? null;

  const indirizzo = quando ? urlFaccia(utente?.id ?? null, quando) : null;

  // La lettera scala con la forma: una lettera di dimensione fissa
  // dentro un cerchio grande sembra un francobollo appiccicato in
  // mezzo, e dentro uno piccolo non ci sta.
  const corpo = Math.round(dimensione * 0.42);

  return (
    <span
      // Il nome per intero ai lettori di schermo: né la lettera né il
      // ritratto dicono chi è, e questa forma compare accanto a ogni
      // post.
      role="img"
      aria-label={nome || "Qualcuno"}
      title={nome || undefined}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full font-display font-bold text-quaderno-inchiostro
        ${indirizzo ? "bg-quaderno-riga" : tinta.pallino}
        ${anello ? `ring-2 ring-offset-2 ring-offset-quaderno-foglio ${tinta.cerchio}` : ""}
        ${className}`}
      style={{ width: dimensione, height: dimensione, fontSize: corpo, lineHeight: 1 }}
    >
      {indirizzo ? (
        <img
          src={indirizzo}
          alt=""
          loading="lazy"
          // `object-cover`: l'immagine arriva già quadrata dal
          // ridimensionamento, ma una faccia messa prima di questa
          // regola — o un giorno con misure diverse — non deve
          // schiacciarsi.
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{(nome || "?").trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
