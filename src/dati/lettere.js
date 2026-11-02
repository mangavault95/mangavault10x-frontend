// «A» per «Àncora», «#» per tutto ciò che non è una lettera («20th
// Century Boys»). Si cambia lettera quando cambia, non per gruppi
// calcolati prima: se l'ordine avesse un'eccezione il titolo non sparisce.
export function letteraDi(titolo) {
  const prima = String(titolo || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .charAt(0)
    .toUpperCase();

  return /[A-Z]/.test(prima) ? prima : "#";
}

export const idLettera = (l) => `lettera-${l === "#" ? "num" : l}`;
