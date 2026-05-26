export default function Toast({ show, text, tone = "success" }) {
  if (!show) return null;
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl shadow-xl text-lg font-semibold z-50 ${tone === "success" ? "bg-green-500 text-white" : "bg-red-600 text-white"}`}>
      {text}
    </div>
  );
}
