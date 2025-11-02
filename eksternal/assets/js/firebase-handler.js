import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  authDomain: "transshipment-8c2da.firebaseapp.com",
  projectId: "transshipment-8c2da",/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  authDomain: "transshipment-8c2da.firebaseapp.com",
  projectId: "transshipment-8c2da",
  storageBucket: "transshipment-8c2da.firebasestorage.app",
  messagingSenderId: "997549413633",
  appId: "1:997549413633:web:b173bddaf4b73cccd13700",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function getStuffingData(agent) {
  const q = query(collection(db, `${agent}_stuffing`));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getCargoData(area) {
  const q = query(collection(db, `cargo_${area.toLowerCase()}`));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

  storageBucket: "transshipment-8c2da.firebasestorage.app",
  messagingSenderId: "997549413633",
  appId: "1:997549413633:web:b173bddaf4b73cccd13700",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function getStuffingData(agent) {
  const q = query(collection(db, `${agent}_stuffing`));
  const snapshot = await getDocs(q);
  const data = [];
  snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
  return data;
}

export async function getCargoData(agent) {
  const q = query(collection(db, `${agent}_cargo`));
  const snapshot = await getDocs(q);
  const data = [];
  snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
  return data;
}
