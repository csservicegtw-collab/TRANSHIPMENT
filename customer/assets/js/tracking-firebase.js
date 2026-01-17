import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

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

export function normalizeBL(input) {
  return (input || "").toString().trim().toUpperCase().replace(/\s+/g, "");
}

export async function fetchTrackingByBL(blNo) {
  const bl = normalizeBL(blNo);
  if (!bl) return null;

  // ✅ Firestore collection: cargo_gateway/{BL}
  const ref = doc(db, "cargo_gateway", bl);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data();
}
