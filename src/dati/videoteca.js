/**
 * Le stagioni tornano a essere una serie.
 *
 * Il server manda una riga per SCHEDA di AnimeClick, e AnimeClick non
 * è coerente con sé stessa: Frieren è una scheda sola con dentro due
 * stagioni numerate 1→38, Isekai Farming sono due schede che ripartono
 * da 1. In griglia, senza far niente, la prima serie occupa un
 * pannello e la seconda due — con due progressi diversi sulla stessa
 * cosa.
 *
 * Qui le righe che il server ha marcato con lo stesso `gruppo_id`
 * diventano un pannello solo. Una serie senza gruppo non è un caso
 * particolare: è un gruppo di una stagione, e chi disegna la griglia
 * non deve accorgersi della differenza.
 *
 * Sta in `dati/` e non accanto ai componenti perché è esattamente il
 * mestiere di questa cartella: tradurre le righe del database in quello
 * che le pagine si aspettano, una volta sola, in un punto solo.
 */

/**
 * A quale famiglia appartiene una parte della serie.
 *
 * Serve a numerarle separatamente, che è la cosa che rende leggibile
 * una scheda alla Bingers: le stagioni si contano fra loro, i film
 * fra loro. Contarle tutte insieme dava «Stagione 3» al film di
 * Chainsaw Man, che stagione non è.
 */
function famigliaDi(parte) {
  switch (parte.tipo) {
    case "film":
      return "film";
    case "ova":
      return "oav";
    case "special":
      return "special";
    // `ona` sta con le stagioni: Cyberpunk: Edgerunners è una serie a
    // tutti gli effetti, e AnimeClick la chiama così solo perché è
    // uscita su Netflix invece che in TV.
    default:
      return "stagione";
  }
}

const NOMI_FAMIGLIA = {
  stagione: "Stagione",
  film: "Film",
  oav: "OAV",
  special: "Special"
};

/**
 * Come si chiamano le parti di una serie, viste tutte insieme.
 *
 * Restituisce un nome per ogni parte, nello stesso ordine. Bisogna
 * guardarle insieme perché il nome di una dipende dalle altre: «Film»
 * quando ce n'è uno, «Film 1» e «Film 2» quando sono due, e
 * «Stagione 3» solo dopo aver contato quante stagioni vere vengono
 * prima — saltando i film, che stagioni non sono.
 *
 * L'etichetta scritta a mano dalla Gestione (`anime.etichetta`) vince
 * sempre: è l'unico posto dove qualcuno ha detto come si chiama.
 */
export function etichetteDi(parti) {
  const contati = {};

  return parti.map((parte) => {
    const famiglia = famigliaDi(parte);

    contati[famiglia] = (contati[famiglia] || 0) + 1;

    if (parte.etichetta) return parte.etichetta;

    const quante = parti.filter((p) => famigliaDi(p) === famiglia).length;
    const nome = NOMI_FAMIGLIA[famiglia];

    // Il numero si scrive solo se c'è qualcosa da distinguere: «Film»
    // da solo si legge meglio di «Film 1», e su una serie con un film
    // solo quel numero prometterebbe un secondo film che non esiste.
    return quante > 1 ? `${nome} ${contati[famiglia]}` : nome;
  });
}

/**
 * Come si chiama una stagione quando nessuno gliel'ha detto.
 *
 * `tutte` è l'elenco in cui questa parte sta: senza, non si può sapere
 * se è la seconda stagione o il primo film. Chi non ce l'ha ricade
 * sulla posizione, che è quello che si faceva prima.
 */
export function etichettaStagione(stagione, indice, tutte = null) {
  if (stagione.etichetta) return stagione.etichetta;

  if (tutte?.length) {
    const nomi = etichetteDi(tutte);
    const posizione = tutte.indexOf(stagione);

    if (posizione >= 0) return nomi[posizione];
  }

  return `Stagione ${stagione.ordine || indice + 1}`;
}

/**
 * Quante stagioni ci sono dentro una scheda.
 *
 * Di solito una. Frieren ne ha due in una scheda sola — 38 puntate
 * numerate di seguito, 28 + 10 — e `tagli` dice da quale puntata
 * comincia ognuna dopo la prima.
 */
function quanteDentro(scheda) {
  return (scheda.tagli?.length || 0) + 1;
}

/**
 * Le stagioni vere di una serie, da qualunque parte arrivino.
 *
 * Sono due problemi diversi con la stessa faccia, e questa funzione li
 * appiattisce in un elenco solo:
 *
 *   - AnimeClick apre una scheda per stagione (Isekai Farming): le
 *     schede stanno insieme in un gruppo, e ognuna è una stagione.
 *   - AnimeClick tiene tutto in una scheda (Frieren): una scheda sola,
 *     e le stagioni si ricavano tagliando l'elenco delle puntate.
 *
 * Chi disegna la pagina non deve sapere quale dei due casi ha davanti:
 * riceve dei blocchi, ognuno col suo pezzo di elenco.
 *
 * `comandi` distingue il primo blocco di ogni scheda dagli altri. Non è
 * un dettaglio grafico: lo stato della visione e il voto stanno sulla
 * RIGA, non sul blocco — AnimeClick di quella serie tiene una scheda
 * sola — quindi ripetere le stelle su ogni blocco farebbe credere che
 * si possa votare una stagione per volta, e cambiarne una le
 * cambierebbe tutte.
 */
export function stagioniDi(schede) {
  const blocchi = [];

  for (const scheda of schede) {
    const episodi = scheda.episodi || [];

    const tagli = [...new Set((scheda.tagli || []).map(Number))]
      .filter((n) => n > 1)
      .sort((a, b) => a - b);

    const confini = [1, ...tagli];

    confini.forEach((da, posizione) => {
      const dopo = confini[posizione + 1] ?? Infinity;
      const primo = posizione === 0;

      // Gli special senza numero (AnimeClick li marca tutti «Ep. 0»)
      // stanno col primo blocco: non appartengono a nessuna stagione,
      // e metterli in fondo li allontanerebbe dal loro contesto.
      const fetta = episodi.filter(
        (e) => (e.numero === 0 && primo) || (e.numero >= da && e.numero < dopo)
      );

      const ultimo = fetta.length ? fetta[fetta.length - 1].numero : da;

      blocchi.push({
        ...scheda,
        chiave: `${scheda.id}-${da}`,
        episodi: fetta,
        comandi: primo,
        // Una scheda intera si presenta col suo titolo; un pezzo di
        // scheda col tratto di elenco che è, perché ripetere lo stesso
        // titolo su tre blocchi non dice a nessuno cosa li distingue.
        sottotitolo: confini.length === 1 ? scheda.titolo : `puntate ${da}–${ultimo}`,
        // L'etichetta scritta a mano vale per la scheda: se la scheda
        // è tagliata in tre, appartiene al primo pezzo.
        etichetta: primo ? scheda.etichetta : null
      });
    });
  }

  return blocchi;
}

/**
 * Lo stato della serie quando le sue stagioni non dicono la stessa cosa.
 *
 * Non è una media: è la domanda che si fa chi filtra. Una serie di cui
 * sto guardando la seconda stagione è «in visione» anche se la prima è
 * finita, e va trovata sotto quel filtro — non sotto «finita», dove
 * non la cercherebbe nessuno.
 */
const PRIORITA = ["in_visione", "da_vedere", "in_pausa", "droppata", "completa"];

function statoDelGruppo(stagioni) {
  const stati = new Set(stagioni.map((s) => s.stato_visione).filter(Boolean));

  if (stati.size === 0) return null;
  if (stati.size === 1) return [...stati][0];

  // «Finita» solo se lo sono tutte: una stagione ancora da vedere basta
  // a rendere la serie non finita.
  return PRIORITA.find((stato) => stati.has(stato)) ?? null;
}

function somma(righe, campo) {
  return righe.reduce((totale, riga) => totale + Number(riga[campo] || 0), 0);
}

/** Una serie come la si guarda in griglia: le sue stagioni messe insieme. */
function componi(stagioni) {
  const prima = stagioni[0];

  const visti = somma(stagioni, "episodi_visti");
  const disponibili = somma(stagioni, "episodi_disponibili");
  const dichiarati = somma(stagioni, "episodi_totali");

  // La prossima uscita è la più vicina fra tutte le stagioni: di norma
  // ce l'ha solo quella in corso, ma non è detto — un film annunciato
  // mentre la serie va avanti ne ha una sua.
  const uscite = stagioni
    .filter((s) => s.prossima_uscita)
    .sort((a, b) => new Date(a.prossima_uscita) - new Date(b.prossima_uscita));

  const voti = stagioni.map((s) => Number(s.voto)).filter((v) => v > 0);

  return {
    // La chiave della lista e l'indirizzo dove si va cliccando. Il
    // pannello porta alla prima stagione: la scheda le mostra comunque
    // tutte, e un indirizzo che cambia quando esce una stagione nuova
    // romperebbe i preferiti.
    chiave: prima.gruppo_id ? `gruppo-${prima.gruppo_id}` : `anime-${prima.id}`,
    id: prima.id,

    gruppoId: prima.gruppo_id ?? null,
    titolo: prima.gruppo_titolo || prima.titolo,
    cover_url: prima.gruppo_cover || prima.cover_url,

    tipo: prima.tipo,
    stato: prima.stato,
    anno_inizio: prima.anno_inizio,

    // Il ripiano in vetrina della pagina personale. Basta UNA
    // stagione segnata perché la serie ci stia: la vetrina è fatta di
    // serie, e chi ha messo fra i preferiti la seconda stagione di
    // Frieren ha messo Frieren.
    preferito: stagioni.some((s) => s.preferito),
    manga_id: stagioni.find((s) => s.manga_id)?.manga_id ?? null,

    stagioni,
    // Le stagioni vere, non le schede: Frieren è una scheda sola e due
    // stagioni, e la griglia deve dire due.
    quanteStagioni: stagioni.reduce((totale, s) => totale + quanteDentro(s), 0),

    episodi_visti: visti,
    episodi_disponibili: disponibili,
    episodi_totali: dichiarati || null,

    stato_visione: statoDelGruppo(stagioni),
    voto: voti.length ? voti.reduce((a, b) => a + b, 0) / voti.length : null,

    prossima_uscita: uscite[0]?.prossima_uscita ?? null,
    prossimo_episodio: uscite[0]?.prossimo_episodio ?? null
  };
}

/**
 * Da elenco di schede a elenco di serie.
 *
 * L'ordine di arrivo si rispetta: il server ordina già per titolo del
 * gruppo e poi per stagione, e rimescolare qui vorrebbe dire due
 * ordinamenti da tenere d'accordo.
 */
export function raggruppa(serie) {
  const gruppi = new Map();

  for (const scheda of serie) {
    const chiave = scheda.gruppo_id ? `gruppo-${scheda.gruppo_id}` : `anime-${scheda.id}`;

    if (!gruppi.has(chiave)) gruppi.set(chiave, []);

    gruppi.get(chiave).push(scheda);
  }

  return [...gruppi.values()].map(componi);
}

/* ==================================================
   LA RICERCA
   ================================================== */

/** Un testo ridotto alle sue lettere: niente accenti, niente segni. */
function normalizza(testo) {
  return String(testo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Questa serie risponde a quello che si sta cercando?
 *
 * Tre cose che la ricerca di prima non faceva, e che sono i tre modi
 * in cui si scrive davvero in una casella:
 *
 *   - le parole possono stare in disordine e con qualcosa in mezzo:
 *     «attacco giganti» trova «L'attacco dei giganti»;
 *   - gli accenti e gli apostrofi non contano: «pokemon» trova
 *     «Pokémon», «lattacco» trova «L'attacco»;
 *   - si può cercare col titolo originale o inglese: «shingeki» e
 *     «kimetsu» trovano le serie che in videoteca hanno un nome
 *     italiano, che è il modo in cui uno se le ricorda quando le ha
 *     conosciute così.
 *
 * Si guarda anche dentro le singole stagioni: cercare «Isekai Farming
 * 2» deve trovare la serie, anche se il pannello si chiama solo
 * «Isekai Farming».
 */
export function corrisponde(serie, testo) {
  const parole = normalizza(testo).split(" ").filter(Boolean);

  if (parole.length === 0) return true;

  const fieno = normalizza(
    [
      serie.titolo,
      ...serie.stagioni.flatMap((s) => [s.titolo, s.titolo_originale, s.titolo_inglese])
    ]
      .filter(Boolean)
      .join(" ")
  );

  return parole.every((parola) => fieno.includes(parola));
}

/**
 * I risultati della ricerca, una riga per serie invece che una per
 * scheda.
 *
 * Cercando «mushoku tensei» AnimeClick risponde tre volte — I, II e
 * III — e mostrarle come tre righe distinte è esattamente la fatica da
 * cui si voleva uscire: sembrano tre cose da aggiungere una per volta,
 * e sono una sola. Le righe si mettono insieme per `radice`, che è il
 * titolo senza il pezzo che distingue una stagione dall'altra e che il
 * server calcola con la stessa regola che poi usa per riconoscerle.
 *
 * Non nasconde niente: la riga porta con sé tutte le sue parti, e chi
 * guarda le vede scritte sotto. E non decide niente — di che parti sia
 * fatta la serie davvero lo dice `getFranchiseAnime`, che legge la
 * pagina delle relazioni invece di indovinarlo dal titolo. Questo è
 * solo il modo di presentare una lista.
 */
export function raggruppaCandidati(candidati) {
  const per = new Map();

  for (const c of candidati) {
    const chiave = c.radice || c.titolo;

    if (!per.has(chiave)) per.set(chiave, []);

    per.get(chiave).push(c);
  }

  return [...per.entries()]
    .map(([radice, parti]) => {
      const perAnno = [...parti].sort((a, b) => (a.anno || 9999) - (b.anno || 9999));

      // Si apre dalla più vecchia: è la scheda madre, quella da cui la
      // pagina delle relazioni vede tutta la famiglia.
      const capo = perAnno[0];

      const anni = parti.map((p) => p.anno).filter(Boolean);

      return {
        radice,
        capo,
        parti: perAnno,
        titolo: capo.titolo,
        copertina: capo.copertina,
        dal: anni.length ? Math.min(...anni) : null,
        al: anni.length ? Math.max(...anni) : null,
        // Il punteggio della riga è il migliore fra le sue parti: se
        // una sola stagione risponde bene a quello che si è scritto,
        // la serie risponde bene.
        punteggio: Math.max(...parti.map((p) => p.punteggio || 0)),
        // Quante di queste schede sono già in videoteca. Serve a dire
        // «ce l'hai già» invece di riproporla come se fosse nuova.
        gia: parti.filter((p) => p.giaInVideoteca).length,
        // Le stesse, ma nella videoteca di un'ALTRA persona: arriva
        // solo quando la ricerca è stata fatta con `per=<id>`, cioè
        // dal pannello dei consigli, e vale zero dappertutto altrove.
        sue: parti.filter((p) => p.giaSua).length
      };
    })
    .sort((a, b) => b.punteggio - a.punteggio);
}
