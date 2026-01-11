import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  authDomain: "transshipment-8c2da.firebaseapp.com",
  projectId: "transshipment-8c2da",
  storageBucket: "transshipment-8c2da.appspot.com",
  messagingSenderId: "997549413633",
  appId: "1:997549413633:web:b173bddaf4b73cccd13700",
  measurementId: "G-21L0CZJ1MC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function fetchVessels(agent) {
  const vesselsCol = collection(db, "stuffing", agent, "vessels");
  const snap = await getDocs(vesselsCol);

  const vessels = [];
  snap.forEach((d) => {
    vessels.push({ id: d.id, ...d.data() });
  });

  vessels.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  return vessels;
}


export async function fetchStuffingDetails(agent, vesselId) {
  const detailsCol = collection(db, "stuffing", agent, "vessels", vesselId, "details");
  const q = query(detailsCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const details = [];
  snap.forEach((d) => {
    details.push({ id: d.id, ...d.data() });
  });

  return details;
}

export async function fetchVessel(agent, vesselId) {
  const vesselRef = doc(db, "stuffing", agent, "vessels", vesselId);
  const snap = await getDoc(vesselRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
