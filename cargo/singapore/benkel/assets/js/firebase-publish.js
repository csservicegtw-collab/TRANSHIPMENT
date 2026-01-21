import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

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

export function normalizeBL(v){
  return (v||"").toString().trim().toUpperCase().replace(/\s+/g,"");
}

function nowDDMMYYYY(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/* ✅ publish row to Firestore collection cargo_gateway/{BL} */
export async function publishRowToFirebase(row){
  const bl = normalizeBL(row.bl);
  if(!bl) throw new Error("BL invalid");

  const payload = {
    blNo: bl,
    status: row.done ? "SHIPMENT RELEASED" : "IN TRANSIT",
    done: !!row.done,
    updatedAt: nowDDMMYYYY(),

    origin: "SURABAYA",
    destination: row.destination || "-",

    // ✅ master data per-row (tidak ikut berubah kalau ada input file baru)
    mv: row.mv || "-",
    stuffing: row.stuffing || "-",
    etdPol: row.etdPol || "-",
    etaTs: row.etaSin || "-",
    tsPort: "SINGAPORE",
    agent: "BENKEL",

    connectingVessel: row.connectingVessel || "-",
    etdTs: row.etdSin || "-",
    etaDestination: row.etaDestination || "-",
    inland: row.inland || "-",
    doRelease: row.doRelease || "-",
    cargoRelease: row.cargoRelease || "-",

    updatedTimestamp: serverTimestamp()
  };

  await setDoc(doc(db, "cargo_gateway", bl), payload, { merge:true });
  return true;
}

/* ✅ delete row from firebase */
export async function deleteRowFromFirebase(bl){
  const id = normalizeBL(bl);
  if(!id) return;
  await deleteDoc(doc(db, "cargo_gateway", id));
}
