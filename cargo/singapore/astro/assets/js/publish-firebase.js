import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

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
function todayDDMMYYYY(){
  const d=new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

export async function publishToFirestore(row){
  const bl = normalizeBL(row.blNo);
  if(!bl) throw new Error("BL INVALID");

  const status = row.done ? "SHIPMENT DONE" : "IN TRANSIT";

  const payload = {
    blNo: bl,
    status,
    done: !!row.done,
    updatedAt: todayDDMMYYYY(),

    master: {
      motherVessel: row.motherVessel || "-",
      stuffingDate: row.stuffingDate || "-",
      etdPol: row.etdPol || "-",
      etaTsPort: row.etaTsPort || "-",
      tsPort: "SINGAPORE",
      agent: "ASTRO"
    },

    shipment: {
      destination: row.destination || "-",
      connectingVessel: row.connectingVessel || "-",
      etdTsPort: row.etdTsPort || "-",
      etaPod: row.etaDestination || "-",
      doRelease: row.doRelease || "-",
      cargoRelease: row.cargoRelease || "-",
      inland: row.inland || "-"
    },

    // customer routing bar
    routing: [
      { code:"POL", place:"SURABAYA", date: row.etdPol || "-", icon:"🏁", active:true },
      { code:"TS", place:"SINGAPORE", date: row.etaTsPort || "-", icon:"🚢", active:true },
      { code:"POD", place: row.destination || "-", date: row.etaDestination || "-", icon:"📦", active:true },
      { code:"INLAND", place: row.inland || "-", date:"-", icon:"🏬", active: (row.inland && row.inland !== "-") }
    ],

    events: [
      { date: row.stuffingDate || "-", location:"SURABAYA", description:"STUFFING COMPLETED" },
      { date: row.etdPol || "-", location:"SURABAYA", description:"DEPARTED POL" },
      { date: row.etaTsPort || "-", location:"SINGAPORE", description:"ARRIVED TS PORT" },
      { date: row.etdTsPort || "-", location:"SINGAPORE", description:"DEPARTED TS PORT" },
      { date: row.etaDestination || "-", location: row.destination || "-", description: row.done ? "SHIPMENT DONE" : "ESTIMATED ARRIVAL POD" }
    ],

    updatedTimestamp: serverTimestamp()
  };

  await setDoc(doc(db, "cargo_gateway", bl), payload, { merge:true });
  return true;
}
