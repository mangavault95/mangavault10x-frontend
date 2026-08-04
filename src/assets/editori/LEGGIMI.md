# I loghi delle case editrici

Lascia cadere qui il file e comparirà da solo: non c'è niente da
registrare nel codice né nel database. Li raccoglie `dati/editori.js`
in fase di build.

## Come si chiama il file

Il nome è l'editore in minuscolo, con i caratteri non alfanumerici
sostituiti da un trattino — la stessa forma che compare nell'indirizzo
quando filtri per editore.

| Editore in collezione | File |
| --- | --- |
| Panini | `panini.svg` |
| J-POP | `j-pop.svg` |
| Star Comics | `star-comics.svg` |
| Dynit | `dynit.svg` |
| Edizioni BD | `edizioni-bd.svg` |
| Coconino Press | `coconino-press.svg` |
| Flashbook Edizioni | `flashbook-edizioni.svg` |
| Granata Press | `granata-press.svg` |
| Play Press | `play-press.svg` |
| Toshokan | `toshokan.svg` |
| Hikari | `hikari.svg` |
| GP | `gp.svg` |

Se non sei sicuro del nome: apri la Collezione, filtra per quell'editore
e guarda l'indirizzo — `?editore=star-comics` significa
`star-comics.svg`.

## Che file

Vanno `.svg`, `.png`, `.webp`, `.jpg`. **Preferisci l'SVG**: resta
nitido a qualsiasi misura e pesa una frazione.

Il logo viene mostrato intero dentro il suo riquadro (`object-contain`),
mai ritagliato, quindi non serve che sia quadrato. Se è su fondo bianco
o trasparente va bene: il riquadro dietro è chiaro apposta.

## Chi non ce l'ha

Non resta un buco. `ui/Marchio` ripiega su una sigla di due lettere su
fondo colorato, con la tinta presa dal nome dell'editore. Puoi
aggiungere i loghi uno alla volta senza che nel frattempo si veda niente
di rotto.

## Una nota sui marchi

Sono marchi registrati delle rispettive case editrici, usati qui per
identificarle in un catalogo personale. Non ridistribuire il sito come
se fosse materiale ufficiale di quegli editori.
