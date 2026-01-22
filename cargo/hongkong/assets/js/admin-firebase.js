import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
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
export const db = getFirestore(app);

/* ✅ normalize BL */
export function normalizeBL(v){
  return (v||"").toString().trim().toUpperCase().replace(/\s+/g,"");
}

/* ✅ DD/MM/YYYY */
export function todayDDMMYYYY(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/* ✅ build payload in SAME document (cargo_gateway/{BL}) */
export function buildCargoPayload(row){
  const bl = normalizeBL(row.bl);
  if(!bl) throw new Error("BL INVALID");

  const done = !!row.done;
  const statusText = done ? "SHIPMENT RELEASED" : "IN TRANSIT";

  const payload = {
    blNo: bl,
    status: statusText,
    done,
    updatedAt: todayDDMMYYYY(),

    // for admin filtering + future expansion
    agent: row.agent || "CHARTERLINK",
    tsPort: row.tsPort || "HONG KONG",

    mv: row.mv || "",
    stuffing: row.stuffing || "",
    etdPol: row.etdPol || "",
    etaTs: row.etaTs || "",

    destination: row.destination || "",
    etdTs: row.etdTs || "",
    etaDestination: row.etaDestination || "",
    inland: row.inland || "",

    connectingVessel: row.connectingVessel || "",
    doRelease: row.doRelease || "",
    cargoRelease: row.cargoRelease || "",

    // keep these for customer compatibility
    origin: "SURABAYA",
    vessel: row.mv || "",
    eta: row.etaDestination || "",

    routing: row.routing || [],
    events: row.events || [],

    updatedTimestamp: serverTimestamp()
  };

  return payload;
}

/* ✅ UPSERT */
export async function upsertCargo(row){
  const payload = buildCargoPayload(row);
  await setDoc(doc(db, "cargo_gateway", payload.blNo), payload, { merge:true });
}

/* ✅ DELETE */
export async function deleteCargo(bl){
  const key = normalizeBL(bl);
  if(!key) return;
  await deleteDoc(doc(db, "cargo_gateway", key));
}

/* ✅ REALTIME LISTENER (MODE 1) */
export function listenCargoGateway({ agent="CHARTERLINK", tsPort="HONG KONG" }, cb){
  const col = collection(db, "cargo_gateway");

  // Firestore cannot order by non-existing timestamp reliably unless it exists.
  // We'll order by updatedTimestamp if present, else Firestore returns docs in default order.
  const qy = query(col, orderBy("updatedTimestamp", "desc"));

  return onSnapshot(qy, (snap)=>{
    const all = [];
    snap.forEach(docSnap=>{
      const d = docSnap.data();
 
      if(String(d.agent||"").toUpperCase() !== agent.toUpperCase()) return;
      if(String(d.tsPort||"").toUpperCase() !== tsPort.toUpperCase()) return;

      all.push({
        id: docSnap.id,
        bl: d.blNo || docSnap.id,

        agent: d.agent || agent,
        tsPort: d.tsPort || tsPort,

        mv: d.mv || "",
        stuffing: d.stuffing || "",
        etdPol: d.etdPol || "",
        etaTs: d.etaTs || "",

        destination: d.destination || "",
        etdTs: d.etdTs || "",
        etaDestination: d.etaDestination || "",
        inland: d.inland || "",

        connectingVessel: d.connectingVessel || "",
        doRelease: d.doRelease || "",
        cargoRelease: d.cargoRelease || "",

        done: !!d.done
      });
    });

    cb(all);
  });
}
