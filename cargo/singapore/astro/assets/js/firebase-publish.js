import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
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

/* ✅ publish row */
export async function publishCargoRow(row){
  const bl = normalizeBL(row?.bl);
  if(!bl) return;

  const payload = {
    blNo: bl,
    status: row.done ? "SHIPMENT DONE" : "IN TRANSIT",
    done: !!row.done,
    updatedAt: nowDDMMYYYY(),

    mv: row.mv || "",
    stuffingDate: row.stuffingDate || "",
    etdPol: row.etdPol || "",
    etaTsPort: row.etaTsPort || "",

    destination: row.destination || "",
    connectingVessel: row.connectingVessel || "",

    etdTsPort: row.etdTsPort || "",
    etaDestination: row.etaDestination || "",
    inland: row.inland || "",
    doRelease: row.doRelease || "",
    cargoRelease: row.cargoRelease || "",

    agent: "ASTRO",
    tsPort: "SINGAPORE",

    updatedTimestamp: serverTimestamp()
  };

  // ✅ collection cargo_gateway/{BL}
  await setDoc(doc(db, "cargo_gateway", bl), payload, { merge:true });
}

/* ✅ delete row */
export async function deleteCargoRow(bl){
  const id = normalizeBL(bl);
  if(!id) return;
  await deleteDoc(doc(db, "cargo_gateway", id));
}
