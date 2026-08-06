# Da dove vengono gli asset della stanza

Niente di quello che si vede nella soglia è disegnato a mano: personaggio,
mobili e materiali sono modelli e texture di terzi. Qui c'è chi li ha fatti
e con che licenza, perché la provenienza di un asset è un fatto che va
scritto, non ricordato.

Quasi tutto è **CC0** (dominio pubblico): nessun obbligo, la riga è qui solo
per tracciabilità. L'unica eccezione è segnata in fondo, e quella
l'attribuzione la richiede davvero.

## Personaggio

| File | Cos'è | Autore | Licenza |
| --- | --- | --- | --- |
| `bibliotecaria.glb` | La bibliotecaria (*Anne*, da *Ultimate Animated Character Pack*) | Quaternius — quaternius.com | CC0 |
| `bibliotecario.glb` | Il personaggio di prima (il Mago di *KayKit – Character Pack: Adventurers*), non più in uso | Kay Lousberg — kaylousberg.com | CC0 |

Il mago è rimasto nella cartella ma non lo importa nessuno, quindi non
finisce nella build: sta lì perché tornare indietro è cambiare una riga in
`tre/indirizzi.js`. Se dopo un po' il personaggio nuovo convince, si
cancella.

**`bibliotecaria.glb` non è il file scaricato.** L'originale sono 671 kB con
dentro quattordici clip d'animazione e un'ascia bipenne: di clip ne servono
due — `Idle`, il respiro da ferma, e `Wave`, il saluto con la mano — e
l'ascia in una biblioteca non ci sta. Tolto il resto e ricompattato il
binario: **481 kB, una sola mesh, un solo disegno per fotogramma** (il mago
ne costava otto).

Attenzione a una cosa, se un giorno si cambia di nuovo personaggio: questi
pacchetti escono da FBX2glTF con `metallicFactor` a 0,4 e `roughness` a
0,27, e con le quattro luci della stanza addosso quella è **plastica
lucida** — è il difetto per cui il mago è stato bocciato, e non era colpa
del mago. Li opacizza `#opacizza` in `tre/libraio.js` al caricamento, e la
riga vale per qualunque modello ci si metta.

## Arredo (`arredo/`)

| File | Cos'è | Autore | Licenza |
| --- | --- | --- | --- |
| `piantaAlta.glb` | La sansevieria: al piede del pilastro e sopra i mobili | Quaternius | CC0 |
| `piantaRicadente.glb` | Il nastrino che sborda dai ripiani e dal davanzale | Quaternius | CC0 |
| `banconeDritto.glb`, `banconeTesta.glb` | I moduli del banco | Quaternius | CC0 |
| `libroAperto.glb` | Il volume aperto sul banco e sul tavolino | Quaternius | CC0 |
| `pianta.glb` | La monstera all'angolo del banco e sopra i mobili di fondo | Quaternius | CC0 |
| `lampadario.glb` | Il lampadario a quattro bracci sopra la sala (*Light Chandelier*). Prima erano globi di vetro: la cosa più moderna della stanza, e in una sala di pietra stonavano. | Quaternius | CC0 |
| `libri.glb` | La pila di volumi sul banco | Kenney — kenney.nl | CC0 |
| `poltrona.glb` | Le poltroncine dell'angolo lettura | Kenney | CC0 |
| `tavolino.glb` | Il tavolino | Kenney | CC0 |
| `tappeto.glb` | Il tappeto | Kenney | CC0 |
| `lampadaTavolo.glb` | La lampada sul banco | Kenney | CC0 |
| `lampadaTerra.glb` | La piantana dell'angolo lettura | Kenney | CC0 |

`scala.glb` non c'è più: era stata tolta dalla scena perché in mezzo
all'inquadratura leggeva come un traliccio davanti alle copertine, ma il
file era rimasto nella cartella — e a differenza del mago, che ha
l'indirizzo scritto per intero e per questo resta fuori dalla build, i
modelli d'arredo hanno l'indirizzo composto (`arredo(nome)` in
`tre/indirizzi.js`): a un `new URL` con dentro una variabile Vite
risponde emettendo **tutta la cartella**, quindi la scala continuava a
spedirsi lo stesso, 20 kB per un modello che nessuno usava più.
Cancellato il file, non il commento: qualunque altro `.glb` finisca in
questa cartella senza essere importato ha lo stesso destino.

**Il pavimento della soglia non è più una texture scaricata.** È
disegnato su un canvas (`creaTexturaPavimento` in `tre/stanza.js`):
doghe a corsi sfalsati, con le fughe, i nodi e un tono diverso per ogni
asse. Il legno di Poly Haven vestiva pavimento, boiserie, banco e travi
cambiando solo il numero di ripetizioni, e il risultato era una stanza
foderata di un colore solo in cui non si capiva dove finisse una
superficie e cominciasse l'altra. Il parquet *dentro lo scaffale* usa
ancora la texture scaricata: là il pavimento si vede di scorcio per due
metri, e le fughe non servono a niente.

## Texture

| Cartella | Cos'è | Autore | Licenza |
| --- | --- | --- | --- |
| `legno/` | Il legno di boiserie, travi, scaffali e del parquet dentro la vetrina (*Wood Table 001*) | Poly Haven — polyhaven.com | CC0 |
| `intonaco/` | L'intonaco, ormai solo di rincalzo (*Plastered Wall 02*) | Poly Haven | CC0 |
| `pietra/` | La muratura delle pareti (*Castle Wall Slates*), diffuse a 768 e normali a 512 | Poly Haven | CC0 |

## L'eccezione: attribuzione dovuta

| File | Cos'è | Autore | Licenza |
| --- | --- | --- | --- |
| `arredo/cassa.glb` | Il registratore di cassa sul banco | **Poly by Google** | **CC-BY 3.0** |

> *Cash register* di Poly by Google, distribuito con licenza
> [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/), via
> [poly.pizza](https://poly.pizza/m/crXBxFOkCIp).

Di registratori di cassa in CC0 non ne esistono — cercati fra Kenney,
Quaternius e il resto di poly.pizza, nessuno ne ha uno. Se un giorno ne
salta fuori uno, sostituirlo qui toglie l'unico obbligo di attribuzione di
tutta la scena; finché resta questo, la riga qui sopra va tenuta.

Tutti i modelli sono stati scaricati da [poly.pizza](https://poly.pizza),
che raccoglie le librerie di Kenney, Quaternius e l'archivio di Google Poly.

## Come sono stati rimpiccioliti (31/07/2026)

Quello che c'è qui dentro non è il file scaricato: è la sua versione
alleggerita. Gli originali pesavano quattro megabyte e mezzo per una stanza
che si guarda da lontano, ed erano il grosso di quello che si aspetta
aprendo il sito.

**Texture** — da JPEG a qualità piena a WebP, con `sharp`: 1,9 MB → 151 kB,
uno scarto medio di 1,5 su 255 rispetto all'originale.

| File | Misura | Qualità |
| --- | --- | --- |
| `legno_diffuse.webp` | 1024 | 85 |
| `legno_normali.webp` | 1024 | 82 |
| `legno_ruvidita.webp` | 512, in scala di grigi | 75 |
| `intonaco_diffuse.webp` | 1024 | 85 |

**`cassa.glb`** — 511 → 228 kB. Si portava dentro una texture PNG da
1024×1024 (290 kB) per un oggetto che sullo schermo occupa cento pixel:
rifatta a 256 in JPEG, 8 kB. Il resto del file è geometria e non si tocca.

Rifarli richiede `sharp` (non è una dipendenza del progetto: si installa
con `npm i --no-save sharp` e si disinstalla dopo). Gli originali si
riscaricano dalle fonti qui sopra.

## `pietra_diffuse.webp`, rifatta una seconda volta (06/08/2026)

Questa non era mai passata dal giro qui sopra: 768×768 a 144 kB, quasi il
doppio di `legno_diffuse` che è più grande (1024) e pesa meno (84 kB). Non
per un errore di qualità — riprovando a comprimerla alla stessa qualità 85
il file usciva più pesante di quello che c'era, 150 kB — ma perché una
pietra fotografata ha più grana ad alta frequenza di una venatura di legno,
e quella grana costa bit indipendentemente da quanto si stringe la
qualità.

Quello che ha funzionato è stato *ridurla*, non ricomprimerla: 768→512,
la stessa misura della sua mappa delle normali (portarle alla stessa
risoluzione non costa nulla in resa, visto che il muro le campiona
insieme). **144 kB → 68 kB**, qualità 82, senza perdita visibile alla
distanza a cui si guarda un muro.

`pietra_normali.webp` è rimasta com'era: una mappa delle normali
compressa più del necessario si vede — rovina la luce che rimbalza sulla
pietra — e il risparmio possibile lì (144→122 kB scendendo a qualità 75)
non valeva il rischio.
