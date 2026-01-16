// tracking-source.js
export function normalizeBL(input) {
  return (input || "").toString().trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * ✅ TEMPORARY MODE (sementara):
 * baca dari localStorage internal data Astro
 * nanti kalau sudah Firebase tinggal diganti fetch firestore
 */
export async function fetchTrackingByBL(blNo) {
  const bl = normalizeBL(blNo);
  if (!bl) return null;

  // ✅ key internal astro (harus sama seperti admin)
  const STORAGE_KEY = "sg_astro_excel_only_vFinal_v2";

  const cargos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  const row = cargos.find(r => normalizeBL(r.bl) === bl);

  if (!row) return null;

  // ✅ bentuk data disamakan supaya tracking-app.js stabil
  return {
    blNo: bl,

    origin: "SURABAYA",
    destination: row.destination || "-",

    motherVessel: row.mv || "-",
    stuffingDate: row.stuffingDate || "-",
    etdPol: row.etdPol || "-",
    etaTsPort: row.etaTs || "-",

    connectingVessel: row.connectVessel || "-",
    etdTsPort: row.etdTs || "-",
    etaDestination: row.etaDestination || "-",

    inland: row.inland || "-",
    doRelease: row.doRelease || "-",
    cargoRelease: row.cargoRelease || "-",

    done: !!row.done,
    updatedAt: "-", // nanti bisa pakai timestamp internal / firebase
  };
}
