/**
 * Da che porta si è usciti dalla stanza.
 *
 * Serve a una cosa sola, che però è quella che distingue una stanza da
 * una schermata: **tornando indietro non si ricomincia da capo**. Se si
 * è usciti dalla cassa si rientra dalla cassa — la telecamera riapre gli
 * occhi addosso al registratore e arretra fino alla soglia. La porta
 * d'ingresso non si riapre, perché non si sta entrando: si sta tornando.
 *
 *
 * PERCHÉ UNA VARIABILE DI MODULO E NON UNO STATO DI REACT
 *
 * Chi deve saperlo è la home, e la home viene smontata e rimontata a
 * ogni giro — è esattamente il motivo per cui questo file esiste. Uno
 * stato dentro l'albero verrebbe distrutto insieme a lei; un contesto
 * sopra le rotte funzionerebbe, ma sarebbe un provider in più per due
 * righe di dato che nessuno deve poter osservare: un cambio qui non deve
 * ridisegnare niente.
 *
 * Non va in `sessionStorage` apposta: ricaricando la pagina si rientra
 * dalla porta, ed è giusto così. Aprire il sito è entrare.
 *
 *
 * PERCHÉ SI LEGGE SENZA CONSUMARE
 *
 * In modalità rigorosa React monta, smonta e rimonta ogni effetto per
 * stanare le pulizie mancanti: una lettura distruttiva darebbe il segno
 * al primo montaggio e niente al secondo, cioè il rientro funzionerebbe
 * in produzione e non in sviluppo — o viceversa, a seconda di quale dei
 * due si guarda per primo. Leggere è puro, e a dimenticare pensa chi ha
 * letto, quando ha finito.
 */

// Quanto vale un'uscita. Generoso rispetto a un rimbalzo (esco, guardo,
// torno) e stretto rispetto a una visita: se la scheda è rimasta aperta
// per un quarto d'ora, quel filo si è rotto e rientrare da un
// registratore di cassa che nessuno ha toccato sarebbe solo strano.
const DURATA = 5 * 60 * 1000;

let uscita = null;

/** Lo lascia la stanza, un istante prima di sparire. */
export function segnaUscita(punto) {
  uscita = punto ? { punto, quando: Date.now() } : null;
}

/** Da dove si sta rientrando, se il segno è ancora fresco. */
export function leggiUscita() {
  if (!uscita) return null;

  return Date.now() - uscita.quando <= DURATA ? uscita.punto : null;
}

/**
 * Un rientro si spende una volta sola.
 *
 * Lo chiama la stanza appena l'ha letto: senza, tornando alla home dalla
 * barra laterale si riemergerebbe da un oggetto che in quel giro non è
 * stato toccato.
 */
export function dimenticaUscita() {
  uscita = null;
}
