// cargo/firestore-sync.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

/* FIREBASE CONFIG */
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
 * ✅ fetch cargo universal
 * filter optional: { agent, tsPort, routeKey }
 */
export async function fetchCargo(filter={}){
  const colRef = collection(db, "cargo_tracking");
  let qRef = colRef;

  const cond = [];
  if(filter.routeKey) cond.push(where("routeKey","==",filter.routeKey.toUpperCase()));
  if(filter.agent) cond.push(where("agent","==",filter.agent.toUpperCase()));
  if(filter.tsPort) cond.push(where("tsPort","==",filter.tsPort.toUpperCase()));

  if(cond.length>0) qRef = query(colRef, ...cond);

  const snap = await getDocs(qRef);
  return snap.docs.map(d => d.data());
}

/**
 * ✅ realtime universal listener
 */
export function listenCargoRealtime(callback, filter={}){
  const colRef = collection(db, "cargo_tracking");

  const cond = [];
  if(filter.routeKey) cond.push(where("routeKey","==",filter.routeKey.toUpperCase()));
  if(filter.agent) cond.push(where("agent","==",filter.agent.toUpperCase()));
  if(filter.tsPort) cond.push(where("tsPort","==",filter.tsPort.toUpperCase()));

  const qRef = cond.length>0 ? query(colRef, ...cond) : colRef;

  return onSnapshot(qRef, (snap)=>{
    const rows = snap.docs.map(d => d.data());
    callback(rows);
  });
}
