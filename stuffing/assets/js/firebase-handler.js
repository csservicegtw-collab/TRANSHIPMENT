// assets/js/firebase-handler.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  authDomain: "transshipment-8c2da.firebaseapp.com",
  projectId: "transshipment-8c2da",
  storageBucket: "transshipment-8c2da.firebasestorage.app",
  messagingSenderId: "997549413633",
  appId: "1:997549413633:web:b173bddaf4b73cccd13700",
  measurementId: "G-21L0CZJ1MC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Simpan data stuffing ke subcollection per vessel
 * Struktur: stuffing/{agent}/{vesselName_voyageNumber}/[doc]
 */
export async function saveStuffingDetail(agent, vesselName, voyageNumber, data) {
  try {
    // format nama vessel & voyage jadi satu nama unik
    const vesselPath = `${vesselName.replace(/\s+/g, "_")}_${voyageNumber}`;

    // tentukan path koleksi
    const colRef = collection(db, "stuffing", agent, vesselPath);

    // simpan data
    await addDoc(colRef, {
      ...data,
      vessel: vesselName,
      voyage: voyageNumber,
      createdAt: new Date().toISOString(),
    });

    console.log("✅ Data berhasil disimpan ke subcollection:", vesselPath);
  } catch (err) {
    console.error("❌ Gagal menyimpan data stuffing:", err);
  }
}
