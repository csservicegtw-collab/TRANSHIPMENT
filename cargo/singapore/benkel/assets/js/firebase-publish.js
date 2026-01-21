import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

/* ✅ FIREBASE CONFIG */
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

/* ✅ Normalize BL */
export function normalizeBL(v){
  return (v||"").toString().trim().toUpperCase().replace(/\s+/g,"");
}

/* ✅ TODAY DD/MM/YYYY */
function todayDDMMYYYY(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/* ✅ BUILD payload to match customer tracking UI */
export function buildPayload(row){
  const bl = normalizeBL(row.bl);
  if(!bl) throw new Error("BL NOT VALID");

  // status
  const done = !!row.done;
  const statusText = done ? "SHIPMENT RELEASED" : "IN TRANSIT";

  const origin = "SURABAYA";
  const tsPort = (row.etdTsPortLabel || row.tsPort || "").toUpperCase() || "SINGAPORE"; // optional
  const destination = row.destination || "-";
  const inland = row.inland || "-";

  const mv = row.mv || row.motherVessel || "-";
  const stuffing = row.stuffing || row.stuffingDate || "-";
  const etdPol = row.etdPol || "-";
  const etaTs = row.etaTs || "-";

  const etdTs = row.etdTs || "-";
  const etaDest = row.etaDestination || row.etaPod || "-";

  const connectingVessel = row.connectingVessel || row.connectVessel || "-";
  const dr = row.doRelease || row.dr || "-";
  const cr = row.cargoRelease || row.cr || "-";

  // routing steps
  const routing = [
    { code:"POL", place: origin, date: etdPol, icon:"🏁", active:true },
    { code:"TS", place: tsPort, date: etaTs, icon:"🚢", active:true },
    { code:"POD", place: destination, date: etaDest, icon:"📦", active:true },
    { code:"INLAND", place: inland, date: "-", icon:"🏬", active: !!(inland && inland !== "-") }
  ];

  // events (minimal but valid)
  const events = [
    { date: stuffing, location: origin, description: "STUFFING COMPLETED" },
    { date: etdPol, location: origin, description: "DEPARTED POL" },
    { date: etaTs, location: tsPort, description: "ARRIVED TS PORT" },
    { date: etdTs, location: tsPort, description: "DEPARTED TS PORT" },
    { date: etaDest, location: destination, description: done ? "SHIPMENT RELEASED" : "ESTIMATED ARRIVAL POD" }
  ];

  return {
    blNo: bl,
    status: statusText,
    done,
    updatedAt: todayDDMMYYYY(),

    origin,
    destination,
    vessel: mv,
    eta: etaDest,
    containerNo: row.containerNo || "-",

    // extra useful fields
    etdPol,
    etaTsPort: etaTs,
    etdTsPort: etdTs,
    etaDestination: etaDest,
    inland,

    motherVessel: mv,
    connectingVessel,
    doRelease: dr,
    cargoRelease: cr,
    stuffingDate: stuffing,

    routing,
    events,

    updatedTimestamp: serverTimestamp()
  };
}

/* ✅ UPSERT document cargo_gateway/{BL} */
export async function upsertToFirestore(row){
  const payload = buildPayload(row);
  const ref = doc(db, "cargo_gateway", payload.blNo);
  await setDoc(ref, payload, { merge:true });
  return true;
}

/* ✅ DELETE document cargo_gateway/{BL} */
export async function deleteFromFirestore(bl){
  const key = normalizeBL(bl);
  if(!key) return;
  const ref = doc(db, "cargo_gateway", key);
  await deleteDoc(ref);
}
