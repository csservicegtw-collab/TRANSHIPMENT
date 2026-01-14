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

export function normalizeBL(v){
  return (v||"").toString().trim().toUpperCase().replace(/\s+/g,"");
}

function todayDDMMYYYY(){
  const d=new Date();
  const dd=String(d.getDate()).padStart(2,"0");
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const yy=d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/* ✅ publish 1 row cargo to Firestore */
export async function publishCargoRow(masterSnapshot, row){
  const bl = normalizeBL(row.bl);
  if(!bl) throw new Error("INVALID BL");

  const statusText = row.done ? "SHIPMENT DONE" : "IN TRANSIT";

  const tsPort = (masterSnapshot.tsPort || "SINGAPORE").toUpperCase();
  const inlandActive = !!(row.inland && String(row.inland).trim() !== "" && row.inland !== "-");

  const payload = {
    blNo: bl,
    status: statusText,
    done: !!row.done,
    updatedAt: todayDDMMYYYY(),

    master: {
      motherVessel: masterSnapshot.mv || "-",
      etdPol: masterSnapshot.etdPol || "-",
      etaTsPort: masterSnapshot.etaTs || "-",
      stuffingDate: masterSnapshot.stuffingDate || "-",
      tsPort,
      agent: masterSnapshot.agent || "ASTRO"
    },

    shipment: {
      destination: row.destination || "-",
      connectingVessel: row.connectVessel || "-",
      etdTsPort: row.etdTs || "-",
      etaPod: row.etaPod || "-",
      doRelease: row.dr || "-",
      cargoRelease: row.cr || "-",
      inland: row.inland || "-"
    },

    routing: [
      { code:"POL", place:"SURABAYA", date: masterSnapshot.etdPol || "-", icon:"🏁", active:true },
      { code:"TS", place: tsPort, date: masterSnapshot.etaTs || "-", icon:"🚢", active:true },
      { code:"POD", place: row.destination || "-", date: row.etaPod || "-", icon:"📦", active:true },
      { code:"INLAND", place: inlandActive ? row.inland : "-", date:"-", icon:"🏬", active: inlandActive }
    ],

    events: buildEvents(masterSnapshot, row, tsPort),

    updatedTimestamp: serverTimestamp()
  };

  await setDoc(doc(db, "cargo_gateway", bl), payload, { merge:true });
  return true;
}

function buildEvents(master, row, tsPort){
  const events = [];

  if(master.stuffingDate) events.push({ date: master.stuffingDate, location:"SURABAYA", description:"STUFFING COMPLETED" });
  if(master.etdPol) events.push({ date: master.etdPol, location:"SURABAYA", description:"DEPARTED POL" });
  if(master.etaTs) events.push({ date: master.etaTs, location: tsPort, description:"ARRIVED TS PORT" });
  if(row.etdTs) events.push({ date: row.etdTs, location: tsPort, description:"DEPARTED TS PORT" });
  if(row.etaPod) events.push({ date: row.etaPod, location: row.destination || "POD", description: row.done ? "SHIPMENT DONE" : "ESTIMATED ARRIVAL POD" });

  if(row.inland && row.inland !== "-") events.push({ date:"-", location: row.inland, description:"INLAND DELIVERY" });

  return events;
}
