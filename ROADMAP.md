# Roadmap

## Decisione in vigore: i lettori sono due, la collezione una

**Dal 20 agosto 2026** il sito ha più di un utente, e la riga che separa le
cose è questa: **quello che si possiede è in comune, quello che si pensa no.**

- **In comune**: le serie, i volumi posseduti, la wishlist, la spesa, i numeri
  della collezione. Sono fatti sugli oggetti che stanno in casa, e non
  cambiano a seconda di chi guarda lo scaffale.
- **Di ciascuno**: i voti e le letture (cronologia e segnalibri). Sono
  giudizi ed esperienze, e appartengono a chi li ha avuti.

Conseguenze pratiche, in ordine di quanto sorprendono:

- **Il voto non è più una colonna della serie.** `"Manga"."Valutazione"` non
  esiste più: al suo posto c'è la tabella `voti`, una riga per (serie,
  persona). La scheda di una serie mostra *Voto Nicer* e *Voto \<lei\>* — due
  numeri distinti, mai una media spacciata per un giudizio. Il campo
  `serie.valutazione` che il resto del sito legge da sempre continua a
  esistere, ma è **ricavato**: è il voto di chi sta guardando, calcolato in
  `CollezioneProvider`. Non si scrive: si passa da `aggiornaVoto`.
- **I voti hanno le mezze stelle** (0,5 … 5). Ogni stella ha due bersagli,
  sinistra e destra; ricliccare il voto che si è già dato lo toglie.
- **Segnare una lettura richiede l'accesso.** Prima le rotte delle letture
  erano aperte: una lettura senza nome adesso non si può registrare. Le
  chiamate passano da `eseguiProtetto`, quindi il modulo si apre dove stai
  lavorando e l'azione riparte da sola.
- **Chi guarda senza essere entrato vede la biblioteca del proprietario**,
  esattamente come prima. È il gradino finale di `utenteLetto` sul server.
- **Chi non ha un accesso può chiederlo** dal modulo stesso. Nasce
  `in_attesa` e non entra: il proprietario se lo trova in Gestione, con la
  pallina sulla voce di menu, e decide. Accettare dà pieni poteri sulle
  schede; restare l'unico che può accettare gli altri è del proprietario e
  basta (`requireProprietario`).

Migrazione: `sql/009_utenti_e_voti.sql` nel repo del backend. **Va eseguita
prima di pubblicare il codice nuovo**, non dopo.

## Decisione in vigore: una schermata sola, che sa di essere toccata

**Dal 6 agosto 2026** il telefono non aspetta più. La regola del 31 luglio —
si rifinisce il desktop, il mobile in un giro dedicato — ha finito il suo
lavoro: quel giro è stato fatto, e da qui in avanti una schermata si considera
finita quando funziona **da monitor e da telefono**.

Quello che *non* è cambiato è altrettanto importante: **non esistono due
versioni del sito**. Non c'è una cartella per il telefono, non c'è una pagina
per il telefono, e nessuna funzione vive solo di qua o solo di là. C'è una
schermata sola che si dispone in modo diverso, e la domanda che decide non è
quanto è largo il vetro:

- **La larghezza** (`sm:` `md:` `lg:`) decide come si dispongono le cose: due
  colonne o una, l'elenco accanto alla scheda o al posto della scheda.
- **`[@media(hover:none)]`** decide cos'è raggiungibile. È la domanda vera,
  perché col dito **non esiste passare sopra le cose**: tutto quello che il
  sito rivela al passaggio del mouse, col dito non esiste e basta. Si legge
  anche da JavaScript, con `useTocco()` (`src/ui/tocco.js`), quando a cambiare
  non è un colore ma una frase.

Un tablet largo senza mouse deve avere il cuore dei preferiti visibile; un
portatile con lo schermo tattile deve averli tutti e due. La larghezza da sola
non lo sa, e infatti chiedendo solo quella si sbagliano tutte e due le volte.

### Come si legge una regola col dito

- **La stanza 3D non c'è più** (tolta il 5 ottobre 2026: la pagina d'ingresso
  è `pages/AdessoPage.jsx`). Le due regole che la riguardavano — il primo
  tocco che vale come passaggio sopra, le due postazioni in verticale — sono
  uscite con lei, insieme a `src/tre/` e a `pages/HomePage.jsx`.
- **I bersagli crescono al tocco, e solo lì.** Ventotto pixel si prendono al
  primo colpo con una freccia larga un pixel, non con un polpastrello largo un
  centimetro. Su un monitor lo stesso bottone a quaranta pixel urlerebbe.
- **`src/mobile/` e `src/components/` non esistono più**: erano l'applicazione
  precedente, non li importava nessuno, e adesso che il telefono vede le
  pagine vere non c'era niente da recuperare. (`src/components/` cancellata il
  20 agosto 2026, insieme al giro dei due lettori: teneva l'indirizzo del
  server scritto a mano e citava una colonna `Valutazione` che non esiste
  più.)

## Aperti

Riscritta il 14 novembre 2026, dopo un controllo dei tre repository. Le voci
sulla stanza (porta animata, peso dei modelli, compressione dei `.glb`) sono
decadute con la stanza; `ANTHROPIC_API_KEY` nel frontend non c'è più.

- **Tre finestre fuori dal foglio comune**: `bibliotecario/Banco.jsx`,
  `ui/videoteca/ConsigliaAnime.jsx`, `ui/videoteca/PostaInArrivo.jsx`. Hanno
  velo, chiusura e fuoco fatti a mano, e meno di quello che `ui/Foglio.jsx` dà
  gratis.
- **Il Tab esce dalle finestre**: `Foglio` dichiara `aria-modal` ma la pagina
  dietro resta raggiungibile da tastiera. La correzione è `inert` su `#root`
  in `ui/Sovrapposizione.jsx` — ma gli avvisi (`ui/Avvisi.jsx`) stanno dentro
  `#root` e diventerebbero intoccabili mentre una finestra è aperta: vanno
  portati fuori prima.
- **Contrasto di `text-ink-faint`**: circa 3:1 sullo sfondo, sotto il 4,5:1
  che serve a un testo piccolo. È usato in un'ottantina di punti, anche per
  testo vero e non solo per decorazioni.
- **Il lato anime scrive senza `eseguiProtetto`**: una sessione scaduta ora
  si vede (il sito torna a «nessuno»), ma la prima azione fallisce invece di
  riaprire l'accesso e ripartire da sola come fa la biblioteca.
- **`react-router` 6**: due avvisi di sicurezza moderati che si chiudono solo
  passando alla 7, che è un cambio incompatibile.
- **Nessuna prova automatica**: i candidati sono le funzioni pure di
  `dati/serie.js`, `dati/kachinuki.js`, `bibliotecario/intenti.js`.
- **Copertine sempre a 384 px**: solo 8 chiamate su 34 a `urlCopertina`
  dicono quanto è grande il riquadro; le altre scaricano 384 px anche per una
  miniatura da 44.
- Pulizia dati: editori duplicati (`Panini` / `Panini S.p.A.`), `DataAggiunta`
  quasi sempre vuoto.
- ~~"Più edizioni della stessa serie"~~: fatta. Ogni edizione è una riga di
  `"Manga"` con la sua `"Edizione"`, collegata alle gemelle da `"OperaId"`
  (`sql/005_edizioni.sql` nel backend, `edizioniSorelle` in `dati/collezione.js`).
