# MangaVault – Project Spec

Documento di riferimento per backend, frontend, flussi e componenti chiave del progetto MangaVault.

---

## 1. Stack e panoramica

**Frontend**
- Framework: React + Vite
- Hosting: Vercel
- URL: `https://mangavault10x-frontend.vercel.app`

**Backend**
- Runtime: Node.js + Express
- DB: PostgreSQL (tabella `"Manga"`)
- Hosting: Render
- URL base API: `https://mangavault10x-api.onrender.com`

---

## 2. Backend

### 2.1. Struttura principale

- `server.js`
- `routes/manga.js`
- `db.js`
- `services/translate.js` (per traduzione trama da Anilist)

### 2.2. `server.js`

```js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ CORS (Express 5 compatibile)
app.use(
  cors({
    origin: [
      "https://mangavault10x-frontend.vercel.app",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// ROUTES
const mangaRoutes = require("./routes/manga");
app.use("/api/manga", mangaRoutes);

app.get("/", (req, res) => {
  res.send("MangaVault API attiva 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

[2.3. routes/manga.js]

const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");
const { translateToItalian } = require("../services/translate");

function cleanHtml(text) {
  return text?.replace(/<[^>]*>/g, "") || "";
}

//
// ✅ ENRICH
//
router.post("/enrich", async (req, res) => {
  try {
    const { titolo, autore } = req.body;

    if (!titolo) {
      return res.status(400).json({ error: "Titolo mancante" });
    }

    const query = `
      query ($search: String) {
        Page(perPage: 10) {
          media(search: $search, type: MANGA) {
            title { romaji english }
            description
            coverImage { large }
            volumes
            staff {
              edges {
                node {
                  name { full }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { search: titolo }
      })
    });

    const result = await response.json();
    const list = result.data?.Page?.media;

    if (!list || list.length === 0) {
      return res.json({ error: "Nessun risultato trovato" });
    }

    let manga =
      list.find(m =>
        m.title.romaji?.toLowerCase().includes(titolo.toLowerCase())
      ) || list[0];

    if (autore) {
      const found = list.find(m =>
        m.staff?.edges?.some(s =>
          s.node.name.full.toLowerCase().includes(autore.toLowerCase())
        )
      );
      if (found) manga = found;
    }

    let trama = cleanHtml(manga.description);

    if (trama.length > 400) {
      trama = trama.substring(0, 400);
    }

    try {
      trama = await translateToItalian(trama);
    } catch {}

    res.json({
      titolo: manga.title.romaji || manga.title.english,
      trama,
      coverurl: manga.coverImage?.large,
      volumitotali: manga.volumes || 0
    });

  } catch (err) {
    console.error("❌ ENRICH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

//
// ✅ LOGIN
//
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    const token = jwt.sign({ user: "admin" }, "SUPER_SECRET", {
      expiresIn: "2h"
    });
    return res.json({ token });
  }

  res.status(401).json({ error: "Credenziali errate" });
});

//
// ✅ AUTH
//
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    jwt.verify(token, "SUPER_SECRET");
    next();
  } catch {
    res.status(403).json({ error: "Token non valido" });
  }
}

//
// ✅ UPDATE MANGA
//
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      coverurl,
      trama,
      volumiposseduti,
      volumitotali
    } = req.body;

    await pool.query(`
      UPDATE "Manga"
      SET
        "CoverURL" = $1,
        "Trama" = $2,
        "VolumiPosseduti" = $3,
        "VolumiTotali" = $4
      WHERE "ID" = $5
    `,
    [
      coverurl || null,
      trama || null,
      volumiposseduti || 0,
      volumitotali || 0,
      id
    ]);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Errore server" });
  }
});

//
// ⭐ UPDATE RATING
//
router.post("/updateRating", auth, async (req, res) => {
  const { id, rating } = req.body;

  try {
    await pool.query(
      `UPDATE "Manga" SET "Valutazione" = $1 WHERE "ID" = $2`,
      [rating, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ UPDATE RATING ERROR:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

//
// GET ALL
//
router.get("/", async (req, res) => {
  const r = await pool.query(`SELECT * FROM "Manga" ORDER BY "ID" DESC`);
  res.json(r.rows);
});

module.exports = router;

3. Frontend
3.1. Endpoint principali usati dal frontend
POST https://mangavault10x-api.onrender.com/api/manga/login

GET https://mangavault10x-api.onrender.com/api/manga

POST https://mangavault10x-api.onrender.com/api/manga/enrich

PUT https://mangavault10x-api.onrender.com/api/manga/:id

POST https://mangavault10x-api.onrender.com/api/manga/updateRating

Tutte le chiamate protette usano:

http
Authorization: Bearer <token>
dove il token viene salvato in localStorage.getItem("token") dopo il login.

4. Componente MangaDetail.jsx
Componente di dettaglio con:

blocco scroll del body

rating con hover preview

salvataggio rating con debounce

toast “Valutazione salvata!”

progress bar avanzata

jsx
import { useEffect, useState, useRef } from "react";

export default function MangaDetail({ manga, onClose }) {

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  if (!manga) return null;

  const [rating, setRating] = useState(Number(manga.Valutazione) || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const debounceRef = useRef(null);

  const owned = Number(manga.VolumiPosseduti) || 0;
  const total = Number(manga.VolumiTotali) || 0;
  const price = Number(manga.Costo) || 0;

  const isCompleted =
    (!!total && total > 0 && owned === total) || manga.Concluso === 1;

  const isOngoing =
    !isCompleted &&
    (!total || total === 0 || manga.VolumiTotali === "?" || manga.Concluso === 0);

  const totalCost = price && owned ? (owned * price).toFixed(2) : "N/A";

  const percent = isCompleted
    ? 100
    : isOngoing
    ? 50
    : total
    ? Math.min((owned / total) * 100, 100)
    : 0;

  // ⭐ CLICK STELLE + DEBOUNCE + SALVATAGGIO BACKEND
  async function handleRating(stars) {
    setRating(stars);
    manga.Valutazione = stars;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          "https://mangavault10x-api.onrender.com/api/manga/updateRating",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
              id: manga.ID,
              rating: stars
            })
          }
        );

        const data = await res.json().catch(() => ({}));
        console.log("UPDATE RATING STATUS:", res.status, data);

        // 🔔 Toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);

      } catch (err) {
        console.error("Errore aggiornamento rating:", err);
      }
    }, 500);
  }

  return (
    <div
      className="fixed inset-0 z-[999] overflow-y-auto"
      onClick={onClose}
    >

      {/* BACKGROUND PATTERN */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, rgba(20,20,20,0.95), rgba(40,40,40,0.95)), url(${manga.CoverURL})`,
          backgroundSize: "120px",
          backgroundRepeat: "repeat",
          opacity: 0.25
        }}
      />

      <div className="absolute inset-0 bg-black/70" />

      {/* CLOSE BUTTON */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center text-2xl text-white hover:bg-white/20 transition z-[999]"
      >
        ✕
      </button>

      {/* TOAST */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-xl text-lg font-semibold animate-fade-in-out z-[9999]">
          ⭐ Valutazione salvata!
        </div>
      )}

      {/* MAIN CARD */}
      <div
        className="relative max-w-5xl mx-auto mt-20 mb-20 p-10 rounded-3xl shadow-2xl border border-white/10 bg-[#1a1a1a]/90 backdrop-blur-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex gap-10">

          {/* COVER */}
          <img
            src={manga.CoverURL}
            className="w-[260px] h-[380px] object-cover rounded-2xl shadow-2xl border border-white/10"
          />

          {/* RIGHT SIDE */}
          <div className="flex-1">

            {/* TITLE */}
            <h1 className="text-5xl font-black text-white mb-2 drop-shadow-xl">
              {manga.Titolo}
            </h1>

            <p className="text-zinc-400 text-lg mb-2">{manga.Autore}</p>

            {/* BADGE STATUS */}
            {isOngoing && (
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-semibold text-sm animate-pulse w-fit">
                <span className="text-lg">⏳</span>
                <span>In corso</span>
              </div>
            )}

            {isCompleted && (
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-semibold text-sm w-fit">
                <span className="text-lg">✅</span>
                <span>Completo</span>
              </div>
            )}

            {/* ⭐ RATING STARS WITH HOVER PREVIEW */}
            <div className="flex items-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map(i => {
                const active = hoverRating ? i <= hoverRating : i <= rating;

                return (
                  <span
                    key={i}
                    onMouseEnter={() => setHoverRating(i)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRating(i)}
                    className={`
                      text-3xl cursor-pointer transition-transform
                      ${active ? "text-yellow-400 glow-star" : "text-zinc-600"}
                      hover:text-yellow-300 active:scale-125
                    `}
                  >
                    ★
                  </span>
                );
              })}
            </div>

            {/* DESCRIPTION */}
            <p className="text-zinc-300 leading-relaxed text-[15px] mb-8 whitespace-pre-line">
              {manga.Trama || "Nessuna descrizione disponibile."}
            </p>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-4 mb-8">

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Volumi posseduti</p>
                <p className="text-3xl font-semibold">{owned}</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Volumi totali</p>
                <p className="text-3xl font-semibold">
                  {total || "?"}
                </p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Costo totale posseduto</p>
                <p className="text-3xl font-semibold">{totalCost}€</p>
              </div>

              <div className="bg-white/5 p-5 rounded-xl border border-white/10">
                <p className="text-xs text-zinc-400">Editore</p>
                <p className="text-2xl font-semibold">
                  {manga.Editore || "N/A"}
                </p>
              </div>

            </div>

            {/* 📊 ADVANCED PROGRESS BAR */}
            <div className="relative h-5 bg-white/10 rounded-full overflow-hidden mb-4 border border-white/10">
              <div
                className={`h-full transition-all ${
                  isCompleted
                    ? "bg-gradient-to-r from-green-400 to-green-600"
                    : "bg-gradient-to-r from-yellow-400 to-yellow-600"
                }`}
                style={{ width: `${percent}%` }}
              />

              <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold drop-shadow">
                {owned}/{total || "?"} volumi
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
5. CSS di supporto
Da aggiungere in index.css o App.css:

css
.glow-star {
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
}

@keyframes fade-in-out {
  0% { opacity: 0; transform: translateY(-10px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-10px); }
}

.animate-fade-in-out {
  animation: fade-in-out 2s ease forwards;
}
6. Note operative
Per modificare il rating:

è necessario essere loggati come admin (/login → token in localStorage)

il rating viene salvato su "Manga"."Valutazione" via POST /api/manga/updateRating

In caso di errori CORS:

verificare che il frontend usi esattamente https://mangavault10x-api.onrender.com

verificare che l’origin sia presente nell’array origin di cors() in server.js

7. Come usare questo file nelle future modifiche
Ogni volta che cambiamo:

endpoint

struttura DB

componenti chiave (es. MangaDetail, login, lista)

Aggiorna questo file (mangavault-spec.md) nel repo.

Nelle prossime chat: incolla il pezzo rilevante o linka il file, così posso riallinearmi subito.
