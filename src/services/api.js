const API_URL = import.meta.env.VITE_API_URL;

export async function getManga() {
  const res = await fetch(`${API_URL}/api/manga`);
  return res.json();
}
