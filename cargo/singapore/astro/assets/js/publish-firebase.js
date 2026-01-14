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

export async function publishRowToFirestore(row){
  const bl = normalizeBL(row?.blNo);
  if(!bl) throw new Error("INVALID BL");

  const statusText = row.done ? "SHIPMENT DONE" : "IN TRANSIT";

  const payload = {
    blNo: bl,
    status: statusText,
    done: !!row.done,
    updatedAt: nowDDMMYYYY(),

    origin: "SURABAYA",
    destination: row.destination || "-",
    vessel: row.motherVessel || "-",
    eta: row.etaDestination || "-",
    containerNo: row.containerNo || "-",

    routing: [
      { code:"POL", place:"SURABAYA", date: row.etdPol || "-", icon:"🏁", active:true },
      { code:"TS",  place: row.tsPort || "TS PORT", date: row.etaTsPort || "-", icon:"🚢", active:true },
      { code:"POD", place: row.destination || "POD", date: row.etaDestination || "-", icon:"📦", active:true },
      { code:"INLAND", place: row.inland || "-", date: "-", icon:"🏬", active: !!row.inland && row.inland!=="-" }
    ],

    events: [
      { date: row.stuffingDate || "-", location:"SURABAYA", description:"STUFFING COMPLETED" },
      { date: row.etdPol || "-", location:"SURABAYA", description:"DEPARTED POL" },
      { date: row.etaTsPort || "-", location: row.tsPort || "TS PORT", description:"ARRIVED TS PORT" },
      { date: row.etdTsPort || "-", location: row.tsPort || "TS PORT", description:"DEPARTED TS PORT" },
      { date: row.etaDestination || "-", location: row.destination || "POD", description: row.done ? "SHIPMENT DONE" : "ESTIMATED ARRIVAL POD" }
    ],

    meta: {
      motherVessel: row.motherVessel || "-",
      stuffingDate: row.stuffingDate || "-",
      etdPol: row.etdPol || "-",
      etaTsPort: row.etaTsPort || "-",
      tsPort: row.tsPort || "-",
      destination: row.destination || "-",
      etdTsPort: row.etdTsPort || "-",
      etaDestination: row.etaDestination || "-",
      connectingVessel: row.connectingVessel || "-",
      doRelease: row.doRelease || "-",
      cargoRelease: row.cargoRelease || "-",
      inland: row.inland || "-",
      agent: row.agent || "ASTRO"
    },

    updatedTimestamp: serverTimestamp()
  };

  await setDoc(doc(db, "cargo_gateway", bl), payload, { merge:true });
  return true;
}

export async function deleteRowFromFirestore(blNo){
  const bl = normalizeBL(blNo);
  if(!bl) return;
  await deleteDoc(doc(db, "cargo_gateway", bl));
}
