const API_URL = "http://localhost:3001/api";

export async function getManga() {
  const res = await fetch(`${API_URL}/manga`);
  return res.json();
}