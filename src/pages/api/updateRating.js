import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  const { id, rating } = req.body;

  const { error } = await supabase
    .from("Manga")
    .update({ Valutazione: rating })
    .eq("ID", id);

  if (error) return res.status(400).json({ error });

  res.status(200).json({ success: true });
}
