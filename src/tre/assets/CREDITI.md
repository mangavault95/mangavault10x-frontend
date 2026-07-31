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
| `bibliotecario.glb` | Il bibliotecario (il Mago di *KayKit – Character Pack: Adventurers*) | Kay Lousberg — kaylousberg.com | CC0 |

## Arredo (`arredo/`)

| File | Cos'è | Autore | Licenza |
| --- | --- | --- | --- |
| `libreria.glb` | La libreria, ripetuta per tutta la parete di sinistra | Quaternius | CC0 |
| `banconeDritto.glb`, `banconeTesta.glb` | I moduli del banco | Quaternius | CC0 |
| `scala.glb` | La scala a pioli | Quaternius | CC0 |
| `libroAperto.glb` | Il volume aperto sul banco e sul tavolino | Quaternius | CC0 |
| `pianta.glb` | Le piante | Quaternius | CC0 |
| `lampadario.glb` | Le lampade a sospensione | Quaternius | CC0 |
| `libri.glb` | La pila di volumi sul banco | Kenney — kenney.nl | CC0 |
| `poltrona.glb` | Le poltroncine dell'angolo lettura | Kenney | CC0 |
| `tavolino.glb` | Il tavolino | Kenney | CC0 |
| `tappeto.glb` | Il tappeto | Kenney | CC0 |
| `lampadaTavolo.glb` | La lampada sul banco | Kenney | CC0 |
| `lampadaTerra.glb` | La piantana dell'angolo lettura | Kenney | CC0 |

## Texture

| Cartella | Cos'è | Autore | Licenza |
| --- | --- | --- | --- |
| `legno/` | Il legno di pavimento, boiserie, travi e scaffali (*Wood Table 001*) | Poly Haven — polyhaven.com | CC0 |
| `intonaco/` | L'intonaco delle pareti (*Plastered Wall 02*) | Poly Haven | CC0 |

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
