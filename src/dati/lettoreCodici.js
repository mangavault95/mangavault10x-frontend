import { useCallback, useEffect, useRef, useState } from "react";

/**
 * La fotocamera che legge i codici a barre (15/11/2026).
 *
 * Safari su iPhone non ha un lettore di codici suo, quindi serve una
 * libreria: ZXing. È pesante (120 kB compressi) e arriva con un `import`
 * dinamico, solo quando si apre la pagina che la usa.
 *
 * Quattro cose che la prima stesura (dentro `ScansionaPage`) sbagliava:
 *
 *   - uscendo dalla pagina MENTRE la fotocamera si stava accendendo, i
 *     comandi per spegnerla arrivavano dopo e nessuno li usava: la
 *     fotocamera restava accesa (il pallino verde di iOS) finché non si
 *     chiudeva il sito. Adesso chi arriva tardi spegne subito;
 *   - passando a un'altra app iOS ferma la ripresa, e tornando il riquadro
 *     restava nero. Adesso si spegne quando la pagina non si vede e si
 *     riaccende quando torna;
 *   - leggeva a bassa risoluzione: un codice piccolo sul retro di un
 *     volume voleva il telefono a dieci centimetri. Si chiede 1280×720;
 *   - buttava via le cifre piccole accanto al codice (l'«aggiunta»), che
 *     nei codici da edicola sono il numero del volume. ZXing di suo non le
 *     legge: ci pensa `cifrePiccole.js`, che dice anche di quali fidarsi.
 *
 * `onLetto(codice, aggiunta)` viene chiamata a ogni lettura riuscita, anche
 * dieci volte al secondo per lo stesso codice: decidere cosa farne è di chi
 * ascolta.
 *
 * Restituisce:
 *   stato     "avvio" | "ok" | "negata" | "assente"
 *   torcia    null se il telefono non la offre al browser, altrimenti accesa/spenta
 *   cambiaTorcia, riprova
 */
export function useLettoreCodici(videoRef, onLetto) {
  const [stato, setStato] = useState("avvio");
  const [torcia, setTorcia] = useState(null);
  const [giro, setGiro] = useState(0);

  const comandi = useRef(null);
  const ascolta = useRef(onLetto);

  useEffect(() => {
    ascolta.current = onLetto;
  });

  useEffect(() => {
    let vivo = true;
    // Ogni accensione ha il suo numero: una che finisce dopo che ne è
    // partita un'altra (o dopo uno spegnimento) sa di essere superata.
    let partenza = 0;

    function spegni() {
      try {
        comandi.current?.stop();
      } catch {
        // già spenta
      }

      comandi.current = null;
    }

    async function accendi() {
      const mia = ++partenza;

      if (!navigator.mediaDevices?.getUserMedia) {
        setStato("assente");
        return;
      }

      setStato("avvio");
      setTorcia(null);

      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType, ResultMetadataType }, { rimediaZxing, aggiuntaFidata }] =
          await Promise.all([import("@zxing/browser"), import("@zxing/library"), import("./cifrePiccole")]);

        // ZXing non legge le cifre piccole per un difetto suo: vedi `cifrePiccole.js`.
        // Se il rimedio non si applica si legge il codice lo stesso, senza di loro.
        await rimediaZxing();

        if (!vivo || mia !== partenza) return;

        // Solo EAN-13: è il codice dei libri (ISBN) e dei periodici. Meno
        // formati da provare a ogni fotogramma vuol dire più fotogrammi al secondo.
        const indizi = new Map([
          [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]],
          [DecodeHintType.TRY_HARDER, true]
        ]);
        const lettore = new BrowserMultiFormatReader(indizi, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 300 });

        const nuovi = await lettore.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
          },
          videoRef.current,
          (risultato) => {
            if (!risultato || !vivo) return;

            const aggiunta = risultato.getResultMetadata()?.get(ResultMetadataType.UPC_EAN_EXTENSION);

            ascolta.current?.(risultato.getText(), aggiuntaFidata(aggiunta));
          }
        );

        // Arrivati tardi (la pagina è stata chiusa, o nascosta, nel frattempo):
        // la fotocamera appena accesa si spegne qui, o non la spegne più nessuno.
        if (!vivo || mia !== partenza) {
          nuovi.stop();
          return;
        }

        comandi.current = nuovi;
        setTorcia(typeof nuovi.switchTorch === "function" ? false : null);
        setStato("ok");
      } catch (e) {
        if (!vivo || mia !== partenza) return;

        setStato(e?.name === "NotAllowedError" || e?.name === "SecurityError" ? "negata" : "assente");
      }
    }

    function alCambioDiVista() {
      if (document.hidden) {
        partenza += 1;
        spegni();
      } else {
        accendi();
      }
    }

    accendi();
    document.addEventListener("visibilitychange", alCambioDiVista);

    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alCambioDiVista);
      spegni();
    };
  }, [videoRef, giro]);

  const cambiaTorcia = useCallback(async () => {
    const accesa = !torcia;

    try {
      await comandi.current?.switchTorch?.(accesa);
      setTorcia(accesa);
    } catch {
      // Il telefono ha detto di averla e poi non l'accende: si toglie il bottone.
      setTorcia(null);
    }
  }, [torcia]);

  const riprova = useCallback(() => setGiro((g) => g + 1), []);

  return { stato, torcia, cambiaTorcia, riprova };
}
