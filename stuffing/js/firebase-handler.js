import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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

export async function saveVessel(agentName, vesselName, voyage) {
  try {
    const collectionName = `${agentName}_vessels`;
    await addDoc(collection(db, collectionName), {
      vessel: vesselName,
      voyage: voyage,
      createdAt: new Date().toISOString()
    });
    console.log(`✅ Vessel ${vesselName} (${agentName}) berhasil disimpan`);
  } catch (err) {
    console.error("❌ Gagal menyimpan vessel:", err);
  }
}

export async function saveStuffingDetail(agentName, vesselName, detailData) {
  try {
    const detailsCol = collection(db, `${agentName}_vessels/${vesselName}/details`);
    await addDoc(detailsCol, detailData);
    console.log(`✅ Detail stuffing disimpan untuk ${vesselName} (${agentName})`);
  } catch (err) {
    console.error("❌ Gagal menyimpan stuffing:", err);
  }
}

export async function getVessels(agentName) {
  const collectionName = `${agentName}_vessels`;
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteVessel(agentName, id) {
  try {
    const collectionName = `${agentName}_vessels`;
    await deleteDoc(doc(db, collectionName, id));
    console.log(`🗑️ Vessel ${id} (${agentName}) dihapus`);
  } catch (err) {
    console.error("❌ Gagal hapus vessel:", err);
  }
}
