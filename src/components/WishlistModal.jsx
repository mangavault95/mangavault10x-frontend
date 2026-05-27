import { useEffect, useState } from "react";

export default function WishlistModal({ onClose, onSaved, initialData }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    Titolo: "",
    Autore: "",
    CoverURL: "",
    Trama: "",
    Genere: "",
    VolumiTotali: ""
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        Titolo: initialData.titolo || "",
        Autore: initialData.autori || "",
        CoverURL: initialData.coverurl || "",
        Trama: initialData.trama || "",
        Genere: initialData.generi || "",
        VolumiTotali: initialData.volumitotali || ""
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (!query || query.length < 3) return;

    const t = setTimeout(async () => {
      setLoading(true);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/manga/enrich`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titolo: query })
        }
      );

      const data = await res.json();

      if (!data.error) {
        setForm({
          Titolo: data.titolo || "",
          Autore: data.autore || "",
          CoverURL: data.coverurl || "",
          Trama: data.trama || "",
          Genere: data.genere || "",
          VolumiTotali: data.volumitotali || ""
        });
      }

      setLoading(false);
    }, 500);

    return () => clearTimeout(t);
  }, [query]);

  async function handleSave() {
    const url = initialData
      ? `${import.meta.env.VITE_API_URL}/api/wishlist/${initialData.id}`
      : `${import.meta.env.VITE_API_URL}/api/wishlist`;

    const method = initialData ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titolo: form.Titolo,
        autori: form.Autore,
        coverurl: form.CoverURL,
        trama: form.Trama,
        generi: form.Genere,
        volumitotali: form.VolumiTotali
      })
    });

    onSaved();
    onClose();
  }

  return (
