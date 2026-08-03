/**
 * I colori dei materiali della biblioteca.
 *
 * Stavano dentro `scena.js`, e finché la biblioteca esisteva in un posto
 * solo andava bene. Adesso il banco si ricostruisce anche fuori di lì —
 * la conversazione col bibliotecario ha una scena sua (`ScenaBanco`) —
 * e due copie degli stessi esadecimali sono due copie che prima o poi
 * divergono: il giorno che il legno della stanza cambia tono, quello del
 * banco resta indietro e si vede subito, perché è lo stesso mobile.
 *
 * Qui non c'è niente che importi three: è un file di numeri, e chi lo
 * legge non si porta dietro mezzo megabyte per sapere di che colore è il
 * legno.
 */

export const COLORE_LEGNO = 0x6b4b32;
export const COLORE_INTONACO = 0xefe3cd;
export const COLORE_OTTONE = 0xc9a24b;

// Il fondo del gradiente dietro allo scaffale. Si vede pochissimo — da
// quando lo scaffale ha una parete e un pavimento attorno, quasi mai —
// ma quando si vede deve essere caldo come il resto.
export const COLORE_FONDO_ALTO = 0xfdfbf4;
export const COLORE_FONDO_BASSO = 0xe9dbc0;
export const COLORE_FOG = 0xe8dcc4;

// Le targhe: l'insegna sopra il banco, i cartellini.
export const COLORE_TARGA = 0x1c1712;
