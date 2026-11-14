/**
 * Quando c'è l'anno in rassegna.
 *
 * Si apre il 31 dicembre alle 00:00 ora italiana e resta aperto per sempre:
 * la stessa regola del server (`services/rassegna.js`, che è quella che
 * conta: qui serve solo a non mostrare un invito o una voce di menu che
 * porterebbero a un 403). Il primo anno è il 2026, quando il sito è nato.
 */

const PRIMO_ANNO = 2026;
const INVITO_GIORNI = 7; // dopo il 31 dicembre l'invito dura una settimana

export const oggiInItalia = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());

/** L'anno di cui si può guardare la rassegna adesso (il più recente aperto), o null. */
export function annoAperto(oggi = oggiInItalia()) {
  const anno = Number(oggi.slice(0, 4));
  const ultimo = oggi >= `${anno}-12-31` ? anno : anno - 1;

  return ultimo >= PRIMO_ANNO ? ultimo : null;
}

export const rassegnaAperta = (anno, oggi = oggiInItalia()) => String(oggi) >= `${anno}-12-31`;

/** L'anno per cui mostrare l'invito (31 dicembre e la settimana dopo), o null. */
export function annoInvito(oggi = oggiInItalia()) {
  const aperto = annoAperto(oggi);

  if (!aperto) return null;

  const giorni = (Date.parse(`${oggi}T00:00:00Z`) - Date.parse(`${aperto}-12-31T00:00:00Z`)) / 86400000;

  return giorni < INVITO_GIORNI ? aperto : null;
}

const chiaveInvito = (anno) => `mangavault:rassegna-invito:${anno}`;

export function invitoVisto(anno) {
  try {
    return localStorage.getItem(chiaveInvito(anno)) === "1";
  } catch {
    return false;
  }
}

export function segnaInvitoVisto(anno) {
  try {
    localStorage.setItem(chiaveInvito(anno), "1");
  } catch {
    /* senza archiviazione l'invito ricompare: meglio di niente */
  }
}
