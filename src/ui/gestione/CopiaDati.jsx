import { useState } from "react";
import { Bottone } from "../Controlli";
import { avvisa } from "../../dati/avvisi";
import { scaricaCopia } from "../../services/api";

/**
 * La copia di sicurezza dei dati.
 *
 * Il piano gratuito di Supabase non ha backup (confermato il 14/11/2026): finché
 * non si scarica un file da qui, i dati stanno in una copia sola.
 *
 * ⚠️ Due passi, «Prepara» e poi «Salva», e non uno. Il foglio di condivisione di
 * iPhone (da cui si salva nei File o su iCloud) si apre solo dentro il tocco che lo
 * chiede: se prima c'è un'attesa di rete — e con Render che si sveglia può durare
 * decine di secondi — il tocco è scaduto e il sistema lo rifiuta. Preparato il file,
 * il secondo tocco è fresco e il foglio si apre sempre.
 *
 * Si ricorda in questo telefono (non sul server) quando è stata salvata l'ultima copia
 * completa, per dire «sono passati N giorni». Cambiando telefono riparte da «mai».
 */

const CHIAVE = "mangavault:copia-salvata";
const GIORNI_AVVISO = 35; // il promemoria su Telegram è il primo del mese

function ultimaCopia() {
  try {
    const v = localStorage.getItem(CHIAVE);

    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

function ricordaCopia() {
  try {
    localStorage.setItem(CHIAVE, new Date().toISOString());
  } catch {
    /* archiviazione non disponibile: la copia c'è lo stesso, manca solo il promemoria */
  }
}

function grandezza(byte) {
  return byte >= 1024 * 1024 ? `${(byte / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(byte / 1024))} kB`;
}

/** Salva il file: foglio di condivisione dove c'è (File, iCloud), altrimenti un download. */
async function consegna(blob, nome) {
  const file = new File([blob], nome, { type: blob.type });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: nome });

      return "salvata";
    } catch (e) {
      // Chiuso il foglio senza scegliere: non è una copia salvata, e non è un errore.
      if (e?.name === "AbortError") return "annullata";
      // Qualunque altro rifiuto: si ripiega sul download.
    }
  }

  const indirizzo = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = indirizzo;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(indirizzo), 60_000);

  return "salvata";
}

function Voce({ tipo, titolo, spiegazione, principale = false, alSalvata }) {
  const [stato, setStato] = useState("pronto"); // pronto | preparo | scaricata | errore
  const [file, setFile] = useState(null);
  const [errore, setErrore] = useState(null);

  async function prepara() {
    setStato("preparo");
    setErrore(null);

    try {
      setFile(await scaricaCopia(tipo));
      setStato("scaricata");
    } catch (e) {
      setErrore(
        e?.status === 403 || e?.status === 401
          ? "Solo il proprietario può scaricare la copia. Esci e rientra se sei tu."
          : e?.status === 429
            ? "Troppe copie in poco tempo. Riprova fra qualche minuto."
            : e?.status === 0
              ? "Il server non risponde: se si sta svegliando, riprova fra qualche secondo."
              : "Non sono riuscito a preparare la copia."
      );
      setStato("errore");
    }
  }

  async function salva() {
    const esito = await consegna(file.blob, file.nome);

    if (esito === "annullata") return;

    alSalvata?.();
    avvisa({ testo: `Salvata: ${file.nome}` });
    setFile(null);
    setStato("pronto");
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-hairline bg-glass-1 px-4 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-medium text-ink-bright">{titolo}</p>
        <p className="text-xs text-ink-muted">{spiegazione}</p>

        {stato === "errore" && (
          <p role="alert" className="mt-1.5 text-xs text-ember">
            {errore}
          </p>
        )}
      </div>

      {stato === "scaricata" ? (
        <Bottone onClick={salva} className="[@media(hover:none)]:min-h-11">
          Salva il file · {grandezza(file.blob.size)}
        </Bottone>
      ) : (
        <Bottone
          variante={principale ? "primario" : "secondario"}
          onClick={prepara}
          disabled={stato === "preparo"}
          className="[@media(hover:none)]:min-h-11"
        >
          {stato === "preparo" ? "Preparo…" : stato === "errore" ? "Riprova" : "Prepara"}
        </Bottone>
      )}
    </li>
  );
}

export default function CopiaDati() {
  const [ultima, setUltima] = useState(ultimaCopia);
  // L'ora si prende una volta sola, all'apertura: leggerla a ogni disegno darebbe risultati instabili.
  const [adesso] = useState(Date.now);

  const giorni = ultima ? Math.max(0, Math.floor((adesso - ultima.getTime()) / 86_400_000)) : null;
  const vecchia = giorni === null || giorni > GIORNI_AVVISO;

  return (
    <section
      aria-label="Copia di sicurezza"
      className="rounded-panel border border-hairline bg-glass-1 p-5 backdrop-blur-xl"
    >
      <h2 className="font-display text-lg font-semibold text-ink-bright">Copia di sicurezza</h2>

      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        I vostri dati stanno in un posto solo e il piano gratuito non fa copie. Tocca «Prepara», poi «Salva il file» e
        scegli File o iCloud. Dentro ci sono serie, volumi, acquisti, letture, voti, note, anime e desideri di tutti e
        due. Non ci sono le password né le chat di Telegram.
      </p>

      <p className={`mt-3 text-sm ${vecchia ? "text-ember" : "text-ink-muted"}`} role={vecchia ? "status" : undefined}>
        {ultima
          ? giorni === 0
            ? "Ultima copia salvata da questo telefono: oggi."
            : `Ultima copia salvata da questo telefono: ${giorni} ${giorni === 1 ? "giorno" : "giorni"} fa${
                vecchia ? ". È ora di farne una." : "."
              }`
          : "Da questo telefono non hai ancora salvato nessuna copia."}
      </p>

      <ul className="mt-4 space-y-3">
        <Voce
          tipo="tutto"
          principale
          titolo="La copia completa"
          spiegazione="Un solo file (JSON) con tutto. È quello che serve per ripristinare."
          alSalvata={() => {
            ricordaCopia();
            setUltima(new Date());
          }}
        />

        <Voce
          tipo="collezione"
          titolo="La collezione per un foglio di calcolo"
          spiegazione="Le serie, una per riga (CSV). Si apre in Numbers, Fogli, Excel."
        />

        <Voce
          tipo="acquisti"
          titolo="Gli acquisti per un foglio di calcolo"
          spiegazione="Ogni acquisto con serie, volumi, prezzo e data (CSV)."
        />
      </ul>
    </section>
  );
}
