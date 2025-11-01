// === FIREBASE HANDLER ===
// Versi CDN agar bisa langsung dipakai di Vercel
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

// === Simpan data vessel ===
export async function saveVessel(agent, vessel, voyage, type) {
  try {
    await addDoc(collection(db, `${agent}_vessels`), {
      vessel,
      voyage,
      type,
      createdAt: new Date().toISOString()
    });
    console.log("✅ Vessel berhasil disimpan ke Firebase");
  } catch (e) {
    console.error("❌ Gagal simpan vessel:", e);
  }
}

// === Simpan detail stuffing ===
export async function saveStuffingDetail(agent, vessel, voyage, detail) {
  try {
    await addDoc(collection(db, `${agent}_stuffing`), {
      vessel,
      voyage,
      ...detail,
      createdAt: new Date().toISOString()
    });
    console.log("✅ Detail stuffing berhasil disimpan ke Firebase");
  } catch (e) {
    console.error("❌ Gagal simpan stuffing:", e);
  }
}
