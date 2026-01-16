export function normalizeBL(input) {
  return (input || "").toString().trim().toUpperCase().replace(/\s+/g, "");
}

let cached = null;

async function loadData() {
  if (cached) return cached;

  // ✅ JSON file path
  const res = await fetch("/customer/data/cargo-data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("DATA SOURCE NOT FOUND");
  cached = await res.json();
  return cached;
}

export async function fetchTrackingByBL(blNo) {
  const bl = normalizeBL(blNo);
  if (!bl) return null;

  const data = await loadData();

  // data harus array
  if (!Array.isArray(data)) return null;

  // cari berdasarkan BL
  const found = data.find((x) => normalizeBL(x.blNo) === bl);
  return found || null;
}
