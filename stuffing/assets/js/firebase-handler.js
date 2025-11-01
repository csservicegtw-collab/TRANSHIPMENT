// firebase-handler.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  authDomain: "transshipment-8c2da.firebaseapp.com",
  projectId: "transshipment-8c2da",
  storageBucket: "transshipment-8c2da.appspot.com",
  messagingSenderId: "958358225256",
  appId: "1:958358225256:web:0a7b3c83f0536f6d0d84e3",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/** Simpan data Vessel utama */
export async function saveVessel(agent, vesselName, voyageNumber) {
  try {
    const vesselId = `${vesselName.replace(/\s+/g, "_")}_${voyageNumber}`;
    const vesselRef = doc(db, "stuffing", agent, "vessels", vesselId);

    await setDoc(vesselRef, {
      vessel: vesselName,
      voyage: voyageNumber,
      updatedAt: new Date().toISOString(),
    });

    console.log("✅ Vessel berhasil disimpan:", vesselId);
  } catch (err) {
    console.error("❌ Gagal menyimpan vessel:", err);
  }
}

/** Simpan detail stuffing ke dalam subcollection "details" */
export async function saveStuffingDetail(agent, vesselName, voyageNumber, data) {
  try {
    const vesselId = `${vesselName.replace(/\s+/g, "_")}_${voyageNumber}`;
    const detailsRef = collection(db, "stuffing", agent, "vessels", vesselId, "details");

    await addDoc(detailsRef, {
      ...data,
      createdAt: new Date().toISOString(),
    });

    console.log(`✅ Data stuffing disimpan ke subcollection 'details' untuk ${vesselId}`);
  } catch (err) {
    console.error("❌ Gagal menyimpan detail stuffing:", err);
  }
}
