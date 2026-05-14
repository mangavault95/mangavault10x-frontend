const API_BASE = import.meta.env.VITE_API_URL;

export const API = {
  getManga: () => fetch(`${API_BASE}/api/manga`).then(r => r.json())
};
