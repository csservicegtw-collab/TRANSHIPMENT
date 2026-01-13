import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
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
  return (v||"").trim().toUpperCase().replace(/\s+/g,"");
}

/* ✅ helper */
function nowDDMMYYYY(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/* ✅ Publish internal row to Firestore */
export async function publishTrackingToFirestore(master, row){
  const bl = normalizeBL(row?.bl);
  if(!bl) throw new Error("BL NOT VALID");

  const transhipmentPort = "SINGAPORE";
  const statusText = row.done ? "SHIPMENT DONE" : "IN TRANSIT";

  // ✅ payload sesuai tracking-app.js customer
  const payload = {
    blNo: bl,
    status: statusText,
    updatedAt: nowDDMMYYYY(),

    origin: "SURABAYA",
    destination: row.destination || "-",
    vessel: master?.mv || "-",
    eta: row.etaPod || "-",
    containerNo: row.containerNo || "-", // optional, kalau belum ada tetap "-"

    // ✅ ROUTING
    routing: [
      { code:"POL", place:"SURABAYA", date:"-", icon:"🏁", active:true },
      { code:"TS", place:transhipmentPort, date: master?.etaTs || "-", icon:"🚢", active:true },
      { code:"POD", place: row.destination || "POD", date: row.etaPod || "-", icon:"📦", active: !!row.done }
    ],

    // ✅ EVENTS (simple auto)
    events: [
      { date:"-", location:"SURABAYA", description:"CARGO RECEIVED" },
      { date: row.etdTs || "-", location: transhipmentPort, description:"DEPARTED TRANSSHIPMENT PORT" },
      { date: row.etaPod || "-", location: row.destination || "POD", description: row.done ? "SHIPMENT DONE" : "ESTIMATED ARRIVAL AT POD" }
    ],

    // ✅ Extra meta info (internal detail)
    meta: {
      agent: "ASTRO",
      transshipmentPort,
      etaTs: master?.etaTs || "-",
      etdTs: row.etdTs || "-",
      etaPod: row.etaPod || "-",
      motherVessel: master?.mv || "-",
      connectingVessel: row.connectVessel || "-",
      doRelease: row.dr || "-",
      cargoRelease: row.cr || "-",
      done: !!row.done
    },

    updatedTimestamp: serverTimestamp()
  };

  await setDoc(doc(db, "tracking", bl), payload, { merge:true });
  return true;
}
