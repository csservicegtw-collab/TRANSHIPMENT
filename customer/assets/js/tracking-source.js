export function normalizeBL(input) {
  return (input || "").toString().trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * ✅ SOURCE LOKAL (sementara)
 * - nanti ganti ke Firebase
 */
export async function fetchTrackingByBL(blNo) {
  const bl = normalizeBL(blNo);
  if (!bl) return null;

  // ✅ contoh data dummy, nanti diganti hasil Firebase
  const mockDB = {
    "SUSSEA-SBY2515082677": {
      blNo: "SUSSEA-SBY2515082677",
      origin: "SURABAYA",
      destination: "JAKARTA",

      motherVessel: "MV JOKO TARUB",
      connectingVessel: "MERATUS",

      stuffingDate: "07/08/2026",
      etdPol: "08/08/2026",
      etaTsPort: "13/08/2026",
      etdTsPort: "01/09/2026",
      etaDestination: "10/09/2026",

      inland: "-",
      doRelease: "15/09/2026",
      cargoRelease: "18/09/2026",

      updatedAt: "02/09/2026",
      done: false,

      containerNo: "-"
    }
  };

  // Simulasi latency biar realistis
  await new Promise((r) => setTimeout(r, 250));

  return mockDB[bl] || null;
}
