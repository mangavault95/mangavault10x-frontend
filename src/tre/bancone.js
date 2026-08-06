import * as THREE from "three";
import { metri } from "./modelli";
import { costruisciParete } from "./stanza";
import { COLORE_TARGA } from "./tinte";

/**
 * Il banco del bibliotecario e la parete che gli sta dietro.
 *
 * Della versione precedente non resta niente di costruito a mano: il
 * banco era due scatole di legno, il registratore di cassa una terza
 * scatola con tre cilindri per tasti, e la "parete" un pannello di
 * intonaco alto poco più del banco, sospeso in mezzo alla stanza. Adesso
 * il banco è il set modulare "Counter" di Quaternius (CC0), la cassa è
 * un registratore vero, e la parete è una parete: da terra al soffitto,
 * con boiserie e cornice come le altre.
 *
 * La parete non sta in fondo alla stanza ma appena dietro il banco. È il
 * retrobanco di una libreria vera — quello a cui si appendono l'insegna,
 * le locandine e la bacheca — e a due metri dietro le spalle si legge,
 * mentre a sei metri sarebbe uno sfondo lontano qualunque.
 *
 * Restituisce mesh e azioni; a registrarle nel raycaster pensa
 * `scena.js`, che è chi le possiede.
 */

const ALTEZZA_BANCO = 0.88; // metri

// La pedana dietro al banco. Non è un vezzo: il personaggio è un chibi
// con le spalle al 58% della propria altezza, e dietro un banco alto
// come un banco vero ne spuntava solo la testa. Un gradino dietro il
// bancone esiste in mezzo mondo — è come fanno i librai bassi a
// guardare in faccia i clienti alti — e restituisce il busto.
const ALTEZZA_PEDANA = 0.26;

export async function costruisciBancone({
  magazzino,
  url,
  pavimentoY,
  soffittoY,
  centroX,
  bancoZ,
  muroZ,
  muroSinistraX,
  destraX,
  pietra,
  legno,
  ottone
}) {
  const gruppo = new THREE.Group();
  const bersagli = [];
  const altezzaStanza = soffittoY - pavimentoY;

  /* ==================================================
     LA PARETE DIETRO — a tutta altezza, come le altre
     ================================================== */

  const sinistraMuro = muroSinistraX;
  const larghezzaMuro = destraX - sinistraMuro;

  const muro = costruisciParete({
    larghezza: larghezzaMuro,
    altezza: altezzaStanza,
    pietra,
    legno,
    ottone,
    senzaLesene: true
  });

  muro.position.set(destraX - larghezzaMuro / 2, pavimentoY, muroZ);
  gruppo.add(muro);

  // Il pilastro che chiude la parete a sinistra. Senza, il muro finisce
  // nel nulla con un bordo di spessore zero e si legge per quello che è
  // — un pannello ritagliato — invece che come il fianco di una stanza
  // che continua.
  const larghezzaPilastro = metri(0.26);

  const pilastro = new THREE.Mesh(
    new THREE.BoxGeometry(larghezzaPilastro, altezzaStanza, metri(0.42)),
    legno
  );
  pilastro.position.set(
    sinistraMuro + larghezzaPilastro / 2,
    pavimentoY + altezzaStanza / 2,
    muroZ + metri(0.12)
  );
  pilastro.castShadow = true;
  pilastro.receiveShadow = true;
  gruppo.add(pilastro);

  // Base e capitello: un parallelepipedo alto quattro metri resta un
  // parallelepipedo, due sporgenze lo fanno leggere come un pilastro.
  for (const [y, altezzaPezzo] of [
    [pavimentoY + metri(0.16), metri(0.32)],
    [pavimentoY + altezzaStanza - metri(0.18), metri(0.36)]
  ]) {
    const pezzo = new THREE.Mesh(
      new THREE.BoxGeometry(larghezzaPilastro * 1.45, altezzaPezzo, metri(0.56)),
      legno
    );
    pezzo.position.set(sinistraMuro + larghezzaPilastro / 2, y, muroZ + metri(0.12));
    pezzo.castShadow = true;
    gruppo.add(pezzo);
  }

  /* ==================================================
     IL BANCO
     Tre moduli in fila: una testata a sinistra e due tratti dritti.
     Le misure non sono scelte, sono quelle che escono dai modelli una
     volta portati all'altezza di un banco vero.
     ================================================== */

  const testata = await magazzino.preleva(url.testa, { alto: ALTEZZA_BANCO });
  if (!testata) return null;

  const larghezzaTestata = testata.userData.misure.x;

  const dritto = await magazzino.preleva(url.dritto, { alto: ALTEZZA_BANCO });
  if (!dritto) return null;

  const larghezzaDritto = dritto.userData.misure.x;
  const profonditaBanco = dritto.userData.misure.z;
  const pianoY = pavimentoY + dritto.userData.misure.y;

  // Si parte dal bordo sinistro e si avanza: così aggiungere o togliere
  // un modulo non obbliga a ricalcolare a mano tutte le posizioni.
  let bordo = centroX - (larghezzaTestata * 2 + larghezzaDritto) / 2;

  const posa = (modulo, larghezza, giraDi = 0) => {
    modulo.position.set(bordo + larghezza / 2, pavimentoY, bancoZ);
    modulo.rotation.y = giraDi;
    gruppo.add(modulo);
    bordo += larghezza;
  };

  // Testata, tratto dritto, testata girata: un banco che finisce con lo
  // stesso pezzo da tutte e due le parti. Tre moduli dritti in fila
  // facevano sette unità di bancone, più lungo del muro che gli sta
  // dietro — un bancone da bar, non da biblioteca.
  posa(testata, larghezzaTestata);
  posa(dritto, larghezzaDritto);

  const altraTestata = await magazzino.preleva(url.testa, { alto: ALTEZZA_BANCO });
  if (!altraTestata) return null;
  posa(altraTestata, larghezzaTestata, Math.PI);

  /* ==================================================
     SOPRA IL BANCO
     ================================================== */

  const sinistraBanco = centroX - (larghezzaTestata * 2 + larghezzaDritto) / 2;
  const destraBanco = bordo;
  const larghezzaBanco = destraBanco - sinistraBanco;

  // La pedana su cui sta il bibliotecario, dietro al banco.
  const altezzaPedana = metri(ALTEZZA_PEDANA);
  const zPedana = bancoZ - profonditaBanco / 2 - metri(0.45);

  const pedana = new THREE.Mesh(
    new THREE.BoxGeometry(larghezzaBanco * 0.92, altezzaPedana, metri(1.1)),
    legno
  );
  pedana.position.set(centroX, pavimentoY + altezzaPedana / 2, zPedana);
  pedana.castShadow = true;
  pedana.receiveShadow = true;
  gruppo.add(pedana);

  // La lampada: un modello vero al posto del cono con dentro una luce.
  const lampada = await magazzino.preleva(url.lampada, { alto: 0.42 });

  if (lampada) {
    lampada.position.set(sinistraBanco + metri(0.5), pianoY, bancoZ + metri(0.1));
    gruppo.add(lampada);

    const fuoco = new THREE.PointLight(0xffb454, 7, metri(4), 2);
    fuoco.position.set(sinistraBanco + metri(0.5), pianoY + metri(0.4), bancoZ + metri(0.1));
    gruppo.add(fuoco);
  }

  // Il registratore di cassa: porta ai Numeri. È l'unico asset della
  // stanza che non sia CC0 — "Cash register" di Poly by Google, CC-BY
  // 3.0, l'attribuzione sta in `assets/CREDITI.md`.
  const cassa = await magazzino.preleva(url.cassa, { alto: 0.46 });

  if (cassa) {
    const x = destraBanco - metri(0.55);

    cassa.position.set(x, pianoY, bancoZ - metri(0.05));
    // Mezzo giro rispetto a prima: la fessura dello scontrino e i tasti
    // guardavano il muro, cioè le spalle a chi entra. Il verso non si
    // ricava dal modello — misurato, è una scatola quasi simmetrica, il
    // dislivello fra le due metà è il 7% dell'altezza — quindi va
    // guardato, e guardandolo era girato.
    cassa.rotation.y = Math.PI - 0.22;
    gruppo.add(cassa);

    const bersaglio = new THREE.Mesh(
      new THREE.BoxGeometry(metri(0.7), metri(0.6), metri(0.7)),
      new THREE.MeshBasicMaterial({ visible: false })
    );

    bersaglio.position.set(x, pianoY + metri(0.28), bancoZ - metri(0.05));
    bersaglio.userData = { punto: "cassa" };
    gruppo.add(bersaglio);

    bersagli.push({ mesh: bersaglio, evidenza: [cassa] });
  }

  // I volumi posati sul banco. Uno aperto, come se qualcuno l'avesse
  // lasciato lì a metà, e una pila accanto: sono arredo e basta.
  //
  // Portavano a In lettura, e non ci portano più. Da qui a un metro
  // stanno la cassa e il bibliotecario, e tre bersagli attaccati sullo
  // stesso piano si rubavano il puntatore a vicenda: adesso il posto
  // dove si va a leggere è il tavolino in mezzo alla stanza (vedi
  // `angolo.js`), che è anche il gesto giusto — ci si siede, non ci si
  // sporge sul banco.
  const aperto = await magazzino.preleva(url.libroAperto, { alto: 0.06 });
  const pila = await magazzino.preleva(url.libri, { alto: 0.22 });

  const xLibri = centroX + metri(0.15);

  if (aperto) {
    aperto.position.set(xLibri, pianoY, bancoZ + metri(0.08));
    aperto.rotation.y = 0.3;
    gruppo.add(aperto);
  }

  if (pila) {
    pila.position.set(xLibri + metri(0.42), pianoY, bancoZ - metri(0.06));
    pila.rotation.y = -0.5;
    gruppo.add(pila);
  }

  /* ---------- La natura, al banco ----------
     Solo quella per terra, nell'angolo fra il banco e il pilastro.
     Sul piano ce n'era una seconda, piccola, accanto alla cassa: non
     serviva a niente. Il banco ha già la lampada, il registratore e i
     volumi lasciati aperti — tre cose che ci stanno perché qualcuno le
     usa. Una piantina in mezzo era l'unica messa lì per riempire, e si
     vedeva. Quella a terra invece occupa un angolo morto, che è
     esattamente il posto dove finiscono le piante vere.

     DOV'ERA E PERCHÉ SEMBRAVA TAGLIATA A METÀ

     Era dietro il banco. Le sue coordinate uscivano dal muro
     (`sinistraMuro + 95 cm`) senza guardare dove finisse davvero il
     bancone, e il bancone comincia lì: risultato, la pianta stava nella
     fessura fra il muro e il mobile, con il vaso e mezzo fusto nascosti
     dal legno e solo le foglie che spuntavano sopra il piano. Da fuori
     era una pianta segata all'altezza del banco.

     Adesso la posizione esce dal **bordo sinistro vero** del bancone —
     quello calcolato posando i moduli — e la mette **fuori**, nello
     spigolo libero fra la testata e il pilastro. Lì si vede tutta, dal
     vaso in su, e resta comunque in un angolo. */

  const angolare = await magazzino.preleva(url.pianta, {
    alto: 0.95,
    tinta: { foglia: -0.03, chiaro: 0.04 }
  });

  if (angolare) {
    angolare.position.set(
      sinistraBanco - metri(0.46),
      pavimentoY,
      bancoZ + metri(0.12)
    );
    angolare.rotation.y = -0.9;
    gruppo.add(angolare);
  }

  // La seconda: la sansevieria ai piedi del pilastro, dalla parte
  // libera. Il pilastro è l'unico spigolo della stanza che scende dritto
  // per quattro metri senza incontrare niente, e una pianta alta e
  // stretta è esattamente quello che si mette al piede di una colonna.
  //
  // Davanti al pilastro e non dietro: dietro sarebbe finita nella
  // fessura fra la parete e il banco, cioè l'errore che si è appena
  // corretto qui sopra.
  const alPilastro = await magazzino.preleva(url.piantaAlta, {
    alto: 1.15,
    tinta: { foglia: 0.05, chiaro: -0.08 }
  });

  if (alPilastro) {
    alPilastro.position.set(sinistraMuro - metri(0.28), pavimentoY, muroZ + metri(0.34));
    alPilastro.rotation.y = 0.7;
    gruppo.add(alPilastro);
  }

  /* ==================================================
     SULLA PARETE
     ================================================== */

  const zParete = muroZ + 0.12;

  // La parete si divide in due: un tratto stretto a sinistra, appena
  // dopo il pilastro, per la bacheca dei desideri, e tutto il resto per
  // insegna e locandine. Le posizioni escono dagli estremi veri della
  // parete invece che da scostamenti attorno al banco: il banco non è
  // centrato sulla parete, e prendere lui come riferimento faceva finire
  // la prima locandina dentro il pilastro.
  const bachecaX = sinistraMuro + metri(0.9);
  const vetrinaMuroSinistra = bachecaX + metri(1);
  const centroMuro = (vetrinaMuroSinistra + destraX - metri(0.4)) / 2;

  // L'insegna. Sta in alto sul muro, non sopra la testa: a due metri e
  // mezzo era all'altezza dei capelli della bibliotecaria e le due cose
  // si contendevano lo stesso pezzo di parete. Un'insegna di negozio sta
  // *sopra* tutto — la si legge entrando, prima di guardare chi c'è
  // dietro al banco — quindi sale fin sotto la cornice del soffitto.
  const insegnaY = pavimentoY + metri(3.35);
  const insegnaLarghezza = metri(2.3);
  const insegnaAltezza = metri(0.82);

  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(insegnaLarghezza + 0.12, insegnaAltezza + 0.12, 0.06),
    ottone
  );
  cornice.position.set(centroMuro, insegnaY, zParete);
  cornice.castShadow = true;
  gruppo.add(cornice);

  const insegna = new THREE.Mesh(
    new THREE.PlaneGeometry(insegnaLarghezza, insegnaAltezza),
    new THREE.MeshBasicMaterial({ map: creaTexturaInsegna(insegnaLarghezza, insegnaAltezza) })
  );
  insegna.position.set(centroMuro, insegnaY, zParete + 0.04);
  gruppo.add(insegna);

  // Due faretti sull'insegna: è quello che la fa leggere come
  // un'insegna accesa invece che come un quadro appeso.
  for (const lato of [-1, 1]) {
    const faretto = new THREE.PointLight(0xffd9a0, 3.2, metri(2.6), 2);
    faretto.position.set(
      centroMuro + lato * insegnaLarghezza * 0.35,
      insegnaY + 0.5,
      zParete + 0.5
    );
    gruppo.add(faretto);
  }

  /* ---------- Le locandine ----------
     Cinque in fila, distribuite su tutta la parete. Cinque e non quattro
     perché la parete è larga otto unità, e quattro locandine piccole in
     mezzo a tutto quel beige leggevano come francobolli.

     **Tutte e cinque prendono copertine vere** della collezione (le
     riempie `scena.js` più tardi). Le due esterne erano grafica
     inventata qui — un retino a puntini con una stella e un balloon
     vuoto, per non citare nessuna testata — e il risultato era che le
     due locandine più larghe della parete erano le uniche che non
     dicevano niente. Il timore era di mettere in mostra roba di altri,
     ma queste copertine sono di manga che stanno in questa collezione:
     non c'è niente da inventare, è la libreria che espone i propri. */
  const locandinaLarghezza = metri(0.72);
  const locandinaAltezza = locandinaLarghezza / 0.7;
  const locandinaY = pavimentoY + metri(1.78);

  const QUANTE_LOCANDINE = 4;
  const primaLocandina = vetrinaMuroSinistra + metri(0.15);
  const ultimaLocandina = destraX - metri(0.55);
  const passoLocandine = (ultimaLocandina - primaLocandina) / (QUANTE_LOCANDINE - 1);

  /* Com'era incorniciata prima, e perché sembrava un adesivo.
     ------------------------------------------------------------------
     Una scatola d'ottone spessa cinque centimetri, e sopra la copertina
     stampata fino al filo del bordo. Due difetti, tutti e due grossi: il
     primo è che una cornice d'ottone pieno non esiste — l'ottone in una
     cornice è il *filetto*, il fastone sottile all'interno, mentre la
     cassa è di legno; il secondo è che una stampa incorniciata non tocca
     mai la cornice, ci sta dentro con intorno il passe-partout, ed è
     proprio quel margine di cartoncino a dire che è una stampa
     incorniciata invece di un'immagine incollata al muro.

     Qui la cornice sono quattro pezzi, come una vera: cassa di legno,
     filetto d'ottone, passe-partout di cartoncino, e il vetro sopra —
     che non è un vetro ma un velo di riflesso, ed è la differenza fra
     "appeso" e "dipinto sul muro".

     Le misure non sono identiche fra una e l'altra — un po' più grande,
     un po' più piccola — ma **il centro sì**: la prima versione le
     alzava e abbassava di cinque centimetri a testa, e il risultato non
     si leggeva come "quadri appesi da qualcuno" ma come una locandina
     scesa dal filo. Quattro cornici a un'unica quota, di taglio
     leggermente diverso, sono quattro quadri appesi da qualcuno che ha
     usato la livella; sfalsate in verticale sono una fila storta. */

  /* Il noce delle cornici.
     ------------------------------------------------------------------
     Non è il legno della stanza, ed è voluto due volte.

     La prima ragione è che una cornice non è mai dello stesso legno del
     mobilio: è più scura, perché deve stare dietro a quello che
     contiene invece che accanto.

     La seconda è tecnica e si vedeva. Il legno della stanza porta la
     texture di Poly Haven applicata con `repeat` 4×2, cioè tarata su
     un'anta di scaffale; spalmata su una battuta di cornice larga
     cinque centimetri diventava una venatura grande quanto la battuta —
     e le quattro cornici sembravano di cartone ondulato. A questa
     misura la venatura non si deve vedere per niente: un profilo di
     cinque centimetri visto da tre metri è un colore, non una
     superficie. */
  const noce = new THREE.MeshStandardMaterial({
    color: 0x3a2418,
    roughness: 0.62,
    metalness: 0.04
  });

  const cartoncino = new THREE.MeshStandardMaterial({
    color: 0xe8dcc2,
    roughness: 0.94,
    metalness: 0
  });

  const vetro = new THREE.MeshBasicMaterial({
    map: creaTexturaVetro(),
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false
  });

  const PASSE = metri(0.05); // il cartoncino attorno alla stampa
  const CASSA = metri(0.045); // la battuta di legno

  const poster = Array.from({ length: QUANTE_LOCANDINE }, (_, indice) => {
    const x = primaLocandina + indice * passoLocandine;

    // Uno scarto stabile per posizione: nessun sorteggio, o le cornici
    // ballano a ogni ricarica. Solo la taglia varia, mai la quota: tutte
    // e quattro condividono `locandinaY`.
    const scala = 1 + [0.05, -0.05, 0.02, -0.03][indice];
    const y = locandinaY;

    const larga = locandinaLarghezza * scala;
    const alta = locandinaAltezza * scala;

    const cassa = new THREE.Mesh(
      new THREE.BoxGeometry(larga + (PASSE + CASSA) * 2, alta + (PASSE + CASSA) * 2, 0.08),
      noce
    );
    cassa.position.set(x, y, zParete);
    cassa.castShadow = true;
    gruppo.add(cassa);

    /* I quattro piani, e perché le loro quote sono spaziate così.
       ----------------------------------------------------------------
       Perché due superfici alla **stessa** profondità non si mettono
       d'accordo su chi sta davanti: il confronto fra le due distanze
       cade dentro l'errore del buffer, e il risultato è che a righe
       alterne vince l'una o l'altra. Sul filetto della prima versione si
       vedeva esattamente questo — bande orizzontali che attraversavano
       l'ottone come una serranda — perché il fronte del filetto e il
       cartoncino stavano tutti e due a `zParete + 0.05`.

       Un centimetro fra un piano e l'altro è più che sufficiente e non
       si vede da nessuna distanza da cui si guardi questa parete. */

    // Il filetto: sporge appena dalla cassa e corre lungo il bordo del
    // cartoncino. È il pezzo che raccoglie la luce dei faretti.
    const filetto = new THREE.Mesh(
      new THREE.BoxGeometry(larga + PASSE * 2 + 0.045, alta + PASSE * 2 + 0.045, 0.06),
      ottone
    );
    filetto.position.set(x, y, zParete + 0.02);
    gruppo.add(filetto);

    const passepartout = new THREE.Mesh(
      new THREE.PlaneGeometry(larga + PASSE * 2, alta + PASSE * 2),
      cartoncino
    );
    passepartout.position.set(x, y, zParete + 0.062);
    gruppo.add(passepartout);

    const quadro = new THREE.Mesh(
      new THREE.PlaneGeometry(larga, alta),
      new THREE.MeshBasicMaterial({ color: 0x2a2320 })
    );

    quadro.position.set(x, y, zParete + 0.072);
    gruppo.add(quadro);

    const riflesso = new THREE.Mesh(
      new THREE.PlaneGeometry(larga + PASSE * 2, alta + PASSE * 2),
      vetro
    );
    riflesso.position.set(x, y, zParete + 0.082);
    gruppo.add(riflesso);

    return quadro;
  });

  /* ---------- La bacheca dei desideri ----------
     Nel tratto di parete fra il pilastro e le locandine, all'altezza
     degli occhi: una pergamena con sopra un elenco stilizzato. Non è un
     elenco da leggere, è un'insegna che dice "qui si scrive cosa
     manca". */
  const bachecaY = pavimentoY + metri(2.05);
  const bachecaLarghezza = metri(0.86);
  const bachecaAltezza = metri(1.16);

  const corniceBacheca = new THREE.Mesh(
    new THREE.BoxGeometry(bachecaLarghezza + 0.12, bachecaAltezza + 0.12, 0.07),
    noce
  );
  corniceBacheca.position.set(bachecaX, bachecaY, zParete);
  corniceBacheca.castShadow = true;
  gruppo.add(corniceBacheca);

  // Lo stesso filetto d'ottone delle locandine, per la stessa ragione:
  // è quello che raccoglie la luce e stacca l'oggetto dal muro. Due
  // cornici sulla stessa parete rifinite in modo diverso si notano.
  const filettoBacheca = new THREE.Mesh(
    new THREE.BoxGeometry(bachecaLarghezza + 0.05, bachecaAltezza + 0.05, 0.06),
    ottone
  );
  filettoBacheca.position.set(bachecaX, bachecaY, zParete + 0.02);
  gruppo.add(filettoBacheca);

  const bacheca = new THREE.Mesh(
    new THREE.PlaneGeometry(bachecaLarghezza, bachecaAltezza),
    new THREE.MeshStandardMaterial({ map: creaTexturaBacheca(), roughness: 0.9 })
  );
  // Un centimetro davanti al fronte del filetto, non a filo: complanari
  // litigavano, e la bacheca si riempiva di righe (vedi le locandine).
  bacheca.position.set(bachecaX, bachecaY, zParete + 0.062);
  gruppo.add(bacheca);

  const bersaglioBacheca = new THREE.Mesh(
    new THREE.BoxGeometry(bachecaLarghezza + 0.3, bachecaAltezza + 0.3, 0.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  bersaglioBacheca.position.set(bachecaX, bachecaY, zParete + 0.2);
  bersaglioBacheca.userData = { punto: "bacheca" };
  gruppo.add(bersaglioBacheca);

  // Cornice e foglio insieme: scegliendo il solo foglio il contorno
  // correrebbe lungo il bordo interno della cornice, come se la bacheca
  // fosse una finestra accesa invece che un oggetto profilato.
  bersagli.push({
    mesh: bersaglioBacheca,
    evidenza: [corniceBacheca, filettoBacheca, bacheca]
  });

  return {
    gruppo,
    bersagli,
    poster,
    pianoY,
    profonditaBanco,
    // Dove sta il bibliotecario: dietro il banco e sopra la pedana, non
    // incastrato dentro il legno.
    postoLibraio: {
      x: centroX - metri(0.3),
      y: pavimentoY + altezzaPedana,
      z: zPedana + metri(0.05)
    }
  };
}

/* ==================================================
   LE TEXTURE DISEGNATE
   Quello che è scritto — un logo, un elenco — non può arrivare da un
   pacchetto di modelli: nessuno ha modellato l'insegna di MangaVault.
   ================================================== */

/**
 * L'insegna: il marchio, il nome e la targhetta.
 *
 * Prima erano due righe di Georgia — «MangaVault» sopra e «10X» sotto,
 * in giallo con un'ombra — e il giudizio di Carmine è stato che *era
 * davvero tanto anonima*. Lo era: una scritta non è un marchio. Un
 * marchio è una forma che si riconosce prima di leggerla, e questa
 * insegna era leggibile e basta.
 *
 * Adesso a sinistra c'è **il portale**: un torii le cui colonne sono due
 * volumi in piedi. È la stessa forma dell'icona nella barra laterale
 * (`portale` in `app/Icon.jsx`) e della favicon, ma qui c'è spazio per
 * quello che là si perderebbe — le nervature sui dorsi, le pagine che si
 * intravedono nel varco. Il varco è il punto: un torii non ha ante, e
 * quello che si vede in mezzo è dove si sta andando.
 *
 * Il nome sta a destra su due righe, e «10X» è una targhetta d'ottone
 * separata invece di una parola gialla — così il nome resta una cosa
 * sola e il numero non deve competerci dentro.
 */
export function creaTexturaInsegna(larghezzaMondo, altezzaMondo) {
  const scala = 320;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(larghezzaMondo * scala);
  canvas.height = Math.round(altezzaMondo * scala);
  const ctx = canvas.getContext("2d");

  const H = canvas.height;
  const W = canvas.width;

  /* Perché non basta più il rettangolo scuro.
     ------------------------------------------------------------------
     La versione di prima era una campitura piatta, un filetto d'ottone
     tirato col righello e due parole senza spessore: in mezzo a una
     parete di pietra vera, con le travi e la boiserie intorno, era
     l'unico oggetto della stanza fatto di niente — e si vedeva, perché
     tutto quello che gli sta accanto ha una superficie.

     Adesso l'insegna è **una tavola**: legno tinto scuro con la sua
     venatura, incassata dentro una battuta, con il filetto d'ottone e le
     borchie agli angoli. E il nome non è più appoggiato sopra: è
     **inciso**, cioè disegnato tre volte — l'ombra sotto, la luce sopra
     e la lettera in mezzo. Sono le tre passate che trasformano del testo
     in qualcosa di scavato nel legno, e costano tre `fillText`. */

  ctx.fillStyle = `#${COLORE_TARGA.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, W, H);

  // Un conto stabile: l'insegna non deve cambiare venatura a ogni
  // ricarica.
  let n = 4051977;
  const prossimo = () => {
    n = (n * 1103515245 + 12345) % 2147483648;
    return (n >> 7) / 16777216;
  };

  // La venatura. Righe lunghe quanto la tavola, appena più chiare o più
  // scure del fondo: da tre metri non si legge una per una, si legge che
  // la superficie non è liscia.
  for (let i = 0; i < 200; i++) {
    const y = prossimo() * H;
    const chiara = prossimo() > 0.55;

    ctx.strokeStyle = chiara
      ? `rgba(206,164,110,${0.02 + prossimo() * 0.05})`
      : `rgba(0,0,0,${0.06 + prossimo() * 0.16})`;
    ctx.lineWidth = 0.5 + prossimo() * 2.4;

    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.bezierCurveTo(
      W * 0.34,
      y + (prossimo() - 0.5) * 14,
      W * 0.68,
      y + (prossimo() - 0.5) * 14,
      W + 10,
      y + (prossimo() - 0.5) * 9
    );
    ctx.stroke();
  }

  // La vignettatura: la tavola prende luce dai due faretti che le stanno
  // sopra, quindi gli angoli restano indietro.
  const ombra = ctx.createRadialGradient(W / 2, H * 0.36, H * 0.18, W / 2, H / 2, W * 0.62);
  ombra.addColorStop(0, "rgba(0,0,0,0)");
  ombra.addColorStop(1, "rgba(0,0,0,0.52)");
  ctx.fillStyle = ombra;
  ctx.fillRect(0, 0, W, H);

  /* ---- La battuta: il pannello sta dentro, non sopra ---- */

  const margine = H * 0.07;

  ctx.lineWidth = H * 0.03;
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.strokeRect(margine, margine, W - margine * 2, H - margine * 2);

  // Il filo di luce sul bordo alto e su quello sinistro: è quello che fa
  // leggere lo scalino come *incassato* invece che come una riga nera.
  ctx.strokeStyle = "rgba(255,228,178,0.16)";
  ctx.lineWidth = H * 0.012;
  ctx.beginPath();
  ctx.moveTo(margine, H - margine);
  ctx.lineTo(margine, margine);
  ctx.lineTo(W - margine, margine);
  ctx.stroke();

  /* ---- Il filetto d'ottone ---- */

  const lucido = ctx.createLinearGradient(0, margine, 0, H - margine);
  lucido.addColorStop(0, "#e8c87e");
  lucido.addColorStop(0.45, "#c9a24b");
  lucido.addColorStop(0.55, "#8a6a2c");
  lucido.addColorStop(1, "#c9a24b");

  ctx.strokeStyle = lucido;
  ctx.lineWidth = H * 0.02;
  ctx.strokeRect(margine * 1.7, margine * 1.7, W - margine * 3.4, H - margine * 3.4);

  // Le borchie: quattro, una per angolo. Sono il dettaglio che dice che
  // la targa è *avvitata* al muro, e da lontano sono quattro luccichii.
  for (const bx of [margine * 1.7, W - margine * 1.7]) {
    for (const by of [margine * 1.7, H - margine * 1.7]) {
      const testa = ctx.createRadialGradient(
        bx - H * 0.008,
        by - H * 0.008,
        0,
        bx,
        by,
        H * 0.034
      );
      testa.addColorStop(0, "#f6e2ac");
      testa.addColorStop(0.55, "#c9a24b");
      testa.addColorStop(1, "#6d5220");

      ctx.fillStyle = testa;
      ctx.beginPath();
      ctx.arc(bx, by, H * 0.034, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  disegnaPortale(ctx, H * 0.22, H * 0.17, H * 0.66);

  const testoX = H * 0.22 + H * 0.66 * 0.78 + H * 0.24;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${H * 0.34}px Georgia, serif`;

  /**
   * Una parola incisa: l'ombra che cade dentro, la luce sul labbro
   * superiore, e sopra la lettera vera.
   */
  const incidi = (parola, y, riempimento) => {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillText(parola, testoX + H * 0.008, y + H * 0.012);

    ctx.fillStyle = "rgba(255,236,196,0.22)";
    ctx.fillText(parola, testoX - H * 0.006, y - H * 0.01);

    ctx.fillStyle = riempimento;
    ctx.fillText(parola, testoX, y);
  };

  // Il nome, su due righe e senza numero. Il «10X» era una targhetta
  // d'ottone appesa al fianco della parola, e non aggiungeva niente: è
  // il nome interno del progetto, non il nome del posto. Un'insegna
  // porta il nome del posto.
  incidi("MANGA", H * 0.46, "#f5f1e6");

  // L'oro non è un giallo: è chiaro in alto, saturo in mezzo e bruno in
  // basso, perché è una superficie curva che riflette. Un `#facc15`
  // piatto è una parola gialla.
  const oro = ctx.createLinearGradient(0, H * 0.52, 0, H * 0.86);
  oro.addColorStop(0, "#ffeeb0");
  oro.addColorStop(0.42, "#facc15");
  oro.addColorStop(1, "#a16207");

  incidi("VAULT", H * 0.83, oro);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Il riflesso sul vetro delle cornici.
 *
 * Non è un vetro: è la sola cosa che di un vetro si vede davvero, cioè
 * la striscia di finestra che ci si specchia dentro. Sommata invece che
 * sovrapposta (`AdditiveBlending`) schiarisce dove la banda è chiara e
 * sparisce del tutto dove è nera, che è esattamente come si comporta un
 * riflesso — e permette di usare la stessa immagine su tutte e quattro
 * le cornici senza che si veda la ripetizione, perché quello che si nota
 * di un riflesso è che c'è, non che forma ha.
 */
function creaTexturaVetro() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Due bande in diagonale, una larga e una stretta: sono i due battenti
  // della finestra che sta dall'altra parte della stanza.
  const banda = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  banda.addColorStop(0, "rgba(255,255,255,0)");
  banda.addColorStop(0.2, "rgba(255,255,255,0)");
  banda.addColorStop(0.3, "rgba(255,255,255,0.85)");
  banda.addColorStop(0.4, "rgba(255,255,255,0.1)");
  banda.addColorStop(0.47, "rgba(255,255,255,0.55)");
  banda.addColorStop(0.58, "rgba(255,255,255,0)");
  banda.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = banda;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Il portale disegnato in grande: torii, e le colonne sono due libri.
 *
 * `alto` è l'altezza totale; la larghezza esce da lì, perché un torii ha
 * proporzioni sue e stirarlo lo fa smettere di essere un torii.
 */
function disegnaPortale(ctx, x, y, alto) {
  const largo = alto * 0.78;
  const colonna = largo * 0.19;

  ctx.save();
  ctx.translate(x, y);

  // L'architrave, curva verso l'alto come il kasagi vero.
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.moveTo(-largo * 0.06, alto * 0.12);
  ctx.quadraticCurveTo(largo / 2, 0, largo * 1.06, alto * 0.12);
  ctx.lineTo(largo * 1.06, alto * 0.21);
  ctx.quadraticCurveTo(largo / 2, alto * 0.09, -largo * 0.06, alto * 0.21);
  ctx.closePath();
  ctx.fill();

  // La traversa.
  ctx.fillStyle = "#c9a24b";
  ctx.fillRect(largo * 0.04, alto * 0.32, largo * 0.92, alto * 0.07);

  // Le due colonne: dorsi di volume, avorio con due nervature d'ottone.
  ctx.fillStyle = "#f5f1e6";
  for (const cx of [largo * 0.1, largo * 0.71]) {
    ctx.fillRect(cx, alto * 0.2, colonna, alto * 0.75);
  }

  ctx.fillStyle = "#a16207";
  for (const cx of [largo * 0.1, largo * 0.71]) {
    ctx.fillRect(cx, alto * 0.47, colonna, alto * 0.035);
    ctx.fillRect(cx, alto * 0.78, colonna, alto * 0.035);
  }

  // Le pagine nel varco: è la parte che dice «di qua si passa».
  ctx.fillStyle = "rgba(250,204,21,0.34)";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(largo * 0.36, alto * (0.53 + i * 0.09), largo * 0.28, alto * 0.03);
  }

  // La base su cui poggia tutto.
  ctx.fillStyle = "#c9a24b";
  ctx.fillRect(0, alto * 0.95, largo, alto * 0.05);

  ctx.restore();
}

function rettangoloTondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * La bacheca dei desideri.
 *
 *
 * DA PERGAMENA A SUGHERO
 *
 * La prima versione era una pergamena con nove righe grigie tutte
 * uguali, e da tre metri non si distingueva da un foglio bianco. La
 * seconda — testata scura, quattro cartellini, le spuntature — si
 * leggeva, ma restava fatta di rettangoli: fondo pulito, cartellini
 * pulitissimi, righe di testo che erano barre grigie piene. Accanto a
 * una parete di pietra e a un pavimento a doghe era l'unico oggetto
 * senza una superficie.
 *
 * Quello che mancava è **il materiale**. Una bacheca dei desideri è di
 * sughero, e il sughero è fatto di granuli: quattrocento macchie di tre
 * toni diversi, ed è il fondo a diventare una cosa invece che un
 * colore. Sopra ci si appunta della carta, e la carta appuntata **non è
 * allineata**: sta storta, si sovrappone, ha l'ombra sotto e l'angolo
 * piegato.
 *
 * E la scrittura non sono barre. Da questa distanza una riga scritta a
 * mano è un tratto ondulato che si interrompe — non un rettangolo pieno
 * — ed è la differenza fra "c'è scritto qualcosa" e "c'è una barra
 * grigia".
 */
function creaTexturaBacheca() {
  const canvas = document.createElement("canvas");
  // Più grande di prima: la bacheca è alta un metro e venti e la si
  // guarda da tre metri, che è vicino abbastanza da vedere i bordi.
  canvas.width = 512;
  canvas.height = 694;
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  let n = 31071981;
  const prossimo = () => {
    n = (n * 1103515245 + 12345) % 2147483648;
    return (n >> 7) / 16777216;
  };

  /* ---- Il sughero ---- */

  ctx.fillStyle = "#c9a271";
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 2600; i++) {
    const x = prossimo() * W;
    const y = prossimo() * H;
    const r = 1.2 + prossimo() * 4.6;
    const t = prossimo();

    ctx.fillStyle =
      t > 0.62
        ? `rgba(150,108,62,${0.16 + prossimo() * 0.3})`
        : t > 0.3
          ? `rgba(226,190,140,${0.12 + prossimo() * 0.24})`
          : `rgba(96,66,34,${0.1 + prossimo() * 0.2})`;

    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + prossimo() * 0.7), prossimo() * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const vignettatura = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.16, W / 2, H / 2, H * 0.72);
  vignettatura.addColorStop(0, "rgba(0,0,0,0)");
  vignettatura.addColorStop(1, "rgba(70,44,16,0.42)");
  ctx.fillStyle = vignettatura;
  ctx.fillRect(0, 0, W, H);

  /* ---- La testata ---- */

  const testata = H * 0.145;

  ctx.fillStyle = "#2a2118";
  ctx.fillRect(0, 0, W, testata);

  // La stessa venatura della tavola dell'insegna: sono lo stesso legno,
  // e su due oggetti appesi allo stesso muro si nota.
  for (let i = 0; i < 70; i++) {
    const y = prossimo() * testata;
    ctx.strokeStyle =
      prossimo() > 0.5
        ? `rgba(198,156,104,${0.03 + prossimo() * 0.05})`
        : `rgba(0,0,0,${0.08 + prossimo() * 0.14})`;
    ctx.lineWidth = 0.6 + prossimo() * 2;
    ctx.beginPath();
    ctx.moveTo(-6, y);
    ctx.bezierCurveTo(W * 0.4, y + (prossimo() - 0.5) * 8, W * 0.7, y, W + 6, y);
    ctx.stroke();
  }

  // Il filo d'ottone che chiude la testata, come la cornice del
  // soffitto e come il filetto delle locandine.
  ctx.fillStyle = "#c9a24b";
  ctx.fillRect(0, testata - 4, W, 4);

  // Il portale in piccolo, a sinistra della parola: è lo stesso marchio
  // dell'insegna, e due oggetti che portano lo stesso segno appartengono
  // allo stesso posto.
  disegnaPortale(ctx, W * 0.055, testata * 0.2, testata * 0.6);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${testata * 0.46}px Georgia, serif`;

  const oro = ctx.createLinearGradient(0, testata * 0.24, 0, testata * 0.76);
  oro.addColorStop(0, "#ffeeb0");
  oro.addColorStop(0.45, "#facc15");
  oro.addColorStop(1, "#a16207");

  const titoloX = W * 0.055 + testata * 0.6 * 0.78 + W * 0.05;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillText("WISHLIST", titoloX + 2, testata * 0.5 + 3);
  ctx.fillStyle = oro;
  ctx.fillText("WISHLIST", titoloX, testata * 0.5);

  /* ---- I biglietti appuntati ---- */

  /** Una riga scritta a mano: tratti ondulati con dei buchi in mezzo. */
  const scrivi = (da, a, y, colore, spessore) => {
    ctx.strokeStyle = colore;
    ctx.lineWidth = spessore;
    ctx.lineCap = "round";

    let x = da;

    while (x < a) {
      const lungo = Math.min(a - x, 9 + prossimo() * 34);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + lungo * 0.3,
        y - 1.6 - prossimo() * 2.4,
        x + lungo * 0.7,
        y + 1.6 + prossimo() * 2.4,
        x + lungo,
        y
      );
      ctx.stroke();

      x += lungo + 3 + prossimo() * 6;
    }
  };

  // Non centrati e non a passo fisso: sono foglietti appuntati da
  // qualcuno, e chi appunta un foglietto non misura.
  const biglietti = [
    { x: 0.5, y: 0.245, larga: 0.76, storto: -0.045, spuntato: true, carta: "#fbf3df" },
    { x: 0.47, y: 0.4, larga: 0.82, storto: 0.03, spuntato: false, carta: "#f4ecd6" },
    { x: 0.53, y: 0.555, larga: 0.72, storto: -0.025, spuntato: true, carta: "#fdf7e8" },
    { x: 0.48, y: 0.71, larga: 0.8, storto: 0.052, spuntato: false, carta: "#f7efd9" },
    { x: 0.51, y: 0.865, larga: 0.7, storto: -0.035, spuntato: false, carta: "#fbf3df" }
  ];

  for (const { x, y, larga, storto, spuntato, carta } of biglietti) {
    const larghezza = W * larga;
    const altezza = H * 0.105;

    ctx.save();
    ctx.translate(W * x, H * y);
    ctx.rotate(storto);

    // L'ombra portata: un foglietto appuntato si stacca dal sughero, e
    // l'unica cosa che lo dice è l'ombra sotto il bordo basso.
    ctx.fillStyle = "rgba(38,22,6,0.34)";
    rettangoloTondo(ctx, -larghezza / 2 + 4, -altezza / 2 + 6, larghezza, altezza, 4);
    ctx.fill();

    ctx.fillStyle = carta;
    rettangoloTondo(ctx, -larghezza / 2, -altezza / 2, larghezza, altezza, 4);
    ctx.fill();

    // L'angolo piegato in basso a destra.
    const piega = altezza * 0.3;
    ctx.fillStyle = "rgba(120,96,58,0.35)";
    ctx.beginPath();
    ctx.moveTo(larghezza / 2, altezza / 2 - piega);
    ctx.lineTo(larghezza / 2, altezza / 2);
    ctx.lineTo(larghezza / 2 - piega, altezza / 2);
    ctx.closePath();
    ctx.fill();

    const sinistra = -larghezza / 2 + altezza * 0.62;
    const destra = larghezza / 2 - altezza * (spuntato ? 0.75 : 0.2);

    // Spesso il doppio di quanto sembrerebbe giusto guardando la tela da
    // sola: il foglio è largo ottanta centimetri e lo si guarda da tre
    // metri, quindi un tratto da due pixel e mezzo su cinquecento arriva
    // a schermo sotto il pixel e sparisce. Quello che si deve vedere non
    // è cosa c'è scritto, è **che** c'è scritto.
    scrivi(sinistra, destra, -altezza * 0.13, "rgba(46,32,16,0.82)", 4.6);
    scrivi(sinistra, sinistra + (destra - sinistra) * 0.58, altezza * 0.2, "rgba(66,50,28,0.5)", 3.2);

    // La puntina: testa tonda con il punto di luce in alto a sinistra e
    // l'ombra sotto. Un cerchio pieno è un bollino.
    const px = -larghezza / 2 + altezza * 0.3;
    const raggio = altezza * 0.17;

    ctx.fillStyle = "rgba(38,22,6,0.4)";
    ctx.beginPath();
    ctx.arc(px + 1.5, 2.5, raggio, 0, Math.PI * 2);
    ctx.fill();

    const testa = ctx.createRadialGradient(
      px - raggio * 0.35,
      -raggio * 0.35,
      0,
      px,
      0,
      raggio
    );

    if (spuntato) {
      testa.addColorStop(0, "#ef9a90");
      testa.addColorStop(0.6, "#b23c32");
      testa.addColorStop(1, "#6d1f18");
    } else {
      testa.addColorStop(0, "#9cc4e4");
      testa.addColorStop(0.6, "#3f6f9a");
      testa.addColorStop(1, "#1e3d59");
    }

    ctx.fillStyle = testa;
    ctx.beginPath();
    ctx.arc(px, 0, raggio, 0, Math.PI * 2);
    ctx.fill();

    if (spuntato) {
      ctx.strokeStyle = "#b23c32";
      ctx.lineWidth = altezza * 0.09;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(larghezza / 2 - altezza * 0.62, -altezza * 0.04);
      ctx.lineTo(larghezza / 2 - altezza * 0.45, altezza * 0.16);
      ctx.lineTo(larghezza / 2 - altezza * 0.18, -altezza * 0.28);
      ctx.stroke();
    }

    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
