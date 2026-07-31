# Roadmap

## Decisione in vigore: si lavora sul desktop, il mobile aspetta

**Dal 31 luglio 2026** ogni lavoro su questo frontend si valuta e si rifinisce
**sulla vista web da schermo largo**. Il telefono non è abbandonato — verrà
sistemato in un giro dedicato — ma fino ad allora:

- una schermata si considera finita quando funziona ed è bella da desktop;
- non si spende tempo a inseguire il layout stretto, e non si rinuncia a una
  scelta che sta bene sul largo solo perché sul telefono starebbe scomoda;
- quello che c'è già di responsive resta e non va rotto apposta, ma non è il
  metro di giudizio.

Il motivo è di ordine, non di disinteresse: la riscrittura sta ancora
definendo l'aspetto delle pagine, e rifinire due layout mentre il primo cambia
ancora vuol dire rifare il secondo ogni volta.

### Cosa è già consapevolmente parziale sul telefono

- **La soglia in 3D** (`src/pages/HomePage.jsx` + `src/tre/`) — su schermo
  verticale la stanza non ci sta in un'inquadratura sola: ci sono due
  postazioni (librerie / banco) e le frecce per passare dall'una all'altra.
  Funziona, ma è un ripiego, non un progetto per il telefono.
- **`src/mobile/`** — resta dell'applicazione precedente e **non è importata
  da nessuna parte**: oggi il telefono vede le stesse pagine del desktop, non
  quei componenti. Da cancellare o da recuperare quando si affronterà il
  mobile per davvero; nel frattempo non è codice vivo.

## Aperti

- La porta d'ingresso animata vera e propria (oggi è un velo CSS sopra il
  canvas, non geometria).
- Pulizia dati: editori duplicati (`Panini` / `Panini S.p.A.`), `DataAggiunta`
  quasi sempre vuoto.
- Spostare `ANTHROPIC_API_KEY` dal `.env` del frontend a Render.
- Peso della home: ~1,4 MB di modelli, ~2 MB di texture e fino a 48 copertine.
  È la pagina d'ingresso, quindi è il primo scarico di ogni visita.
- "Più edizioni della stessa serie": idea non ancora progettata, non esiste
  nessuna colonna né tabella.
