const API_URL = "fetch(`${import.meta.env.VITE_API_URL}/api`)";

export async function getManga() {
  const res = await fetch(`${API_URL}/manga`);
  return res.json();
}
