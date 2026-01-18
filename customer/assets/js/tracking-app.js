import { fetchTrackingByBL, normalizeBL } from "./tracking-firebase.js";

const $ = (id) => document.getElementById(id);

function escapeHtml(str="") {
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function val(v){
  const s = (v ?? "").toString().trim();
  return s ? s : "-";
}
function isEmptyDash(v){
  const s = (v ?? "").toString().trim();
  return !s || s === "-";
}
function todayDDMMYYYY(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/* ✅ ambil field, support flat maupun nested */
function pick(doc, paths=[]){
  for(const p of paths){
    const parts = p.split(".");
    let cur = doc;
    let ok = true;
    for(const k of parts){
      if(cur && Object.prototype.hasOwnProperty.call(cur, k)){
        cur = cur[k];
      }else{
        ok = false;
        break;
      }
    }
    if(ok && cur !== undefined && cur !== null && String(cur).trim() !== ""){
      return cur;
    }
  }
  return "";
}

/* ✅ TS Port resolver */
function resolveTsPort(doc){
  const fromField = pick(doc, [
    "master.tsPort",
    "meta.transshipmentPort",
    "tsPort",
    "transhipmentPort",
    "shipment.tsPort"
  ]);

  if(fromField) return String(fromField).toUpperCase();

  const agent = String(pick(doc, ["master.agent","meta.agent","agent"]) || "").toUpperCase();
  if(agent.includes("ASTRO")) return "SINGAPORE";
  if(agent.includes("BENKEL")) return "SINGAPORE";
  if(agent.includes("CHARTERLINK")) return "HONG KONG";
  if(agent.includes("COLOAD")) return "HONG KONG";

  return "-";
}

function showMsg(text, type="success"){
  const el = $("msg");
  el.className = `msg show ${type}`;
  el.textContent = text;
}
function hideMsg(){
  const el = $("msg");
  el.className = "msg";
  el.textContent = "";
}
function setLoading(isLoading){
  $("btnTrack").disabled = isLoading;
  $("btnTrack").textContent = isLoading ? "Loading..." : "Track";
}

/* ===== HEADER ===== */
function renderHeader(doc, bl){
  const motherVessel = pick(doc, ["motherVessel","master.motherVessel","meta.motherVessel"]);
  const stuffingDate = pick(doc, ["stuffingDate","master.stuffingDate","meta.stuffingDate"]);
  const etdPol = pick(doc, ["etdPol","master.etdPol","meta.etdPol"]);
  const etaTsPort = pick(doc, ["etaTsPort","master.etaTsPort","meta.etaTs","meta.etaTsPort"]);
  const etdTs = pick(doc, ["etdTs","shipment.etdTsPort","meta.etdTs","meta.etdTsPort"]);
  const destination = pick(doc, ["destination","shipment.destination","shipment.pod"]);
  const etaDest = pick(doc, ["etaDestination","shipment.etaPod","etaPod","meta.etaPod","meta.etaDestination"]);
  const connectingVessel = pick(doc, ["connectingVessel","shipment.connectingVessel","meta.connectingVessel"]);
  const inland = pick(doc, ["inland","shipment.inland","meta.inland"]);

  $("blText").textContent = doc.blNo || doc.bl || bl;

  // ✅ customer tidak pakai SHIPMENT DONE lagi
  $("statusText").textContent = doc.done ? "SHIPMENT RELEASED" : "IN TRANSIT";
  $("updatedText").textContent = val(doc.updatedAt || todayDDMMYYYY());

  $("originText").textContent = "SURABAYA";
  $("destText").textContent = val(destination);

  $("tsPortText").textContent = val(resolveTsPort(doc));

  $("mvText").textContent = val(motherVessel);
  $("connectText").textContent = val(connectingVessel);

  $("stuffingText").textContent = val(stuffingDate);
  $("etdPolText").textContent = val(etdPol);

  $("etaTsText").textContent = val(etaTsPort);
  $("etdTsText").textContent = val(etdTs);

  $("etaDestText").textContent = val(etaDest);
  $("inlandText").textContent = val(inland);
}

/* ===== ROUTING ===== */
function buildRouting(doc){
  const tsPort = resolveTsPort(doc);

  const stuffingDate = pick(doc, ["stuffingDate","master.stuffingDate","meta.stuffingDate"]);
  const etdPol = pick(doc, ["etdPol","master.etdPol","meta.etdPol"]);
  const etaTsPort = pick(doc, ["etaTsPort","master.etaTsPort","meta.etaTs","meta.etaTsPort"]);
  const etdTs = pick(doc, ["etdTs","shipment.etdTsPort","meta.etdTs","meta.etdTsPort"]);
  const destination = pick(doc, ["destination","shipment.destination","shipment.pod"]);
  const etaDest = pick(doc, ["etaDestination","shipment.etaPod","etaPod","meta.etaPod","meta.etaDestination"]);
  const inland = pick(doc, ["inland","shipment.inland","meta.inland"]);

  const route = [
    { code:"POL", place:"SURABAYA", date: val(etdPol), icon:"🏁", active:true },
    { code:"TRANSSHIPMENT", place: tsPort, date: val(etaTsPort), icon:"🚢", active: !isEmptyDash(etaTsPort) },
    { code:"DEPARTURE", place: tsPort, date: val(etdTs), icon:"⛴️", active: !isEmptyDash(etdTs) },
    { code:"DESTINATION", place: val(destination), date: val(etaDest), icon:"📦", active: !isEmptyDash(etaDest) }
  ];

  // ✅ inland icon muncul hanya jika inland diisi
  if(!isEmptyDash(inland)){
    route.push({ code:"INLAND", place: val(inland), date:"-", icon:"🏬", active:true });
  }

  return route;
}

function renderRouting(routing=[]){
  const root = $("routingBar");

  if(!Array.isArray(routing) || routing.length === 0){
    root.innerHTML = `<div style="opacity:.85;padding:10px;">Routing belum tersedia.</div>`;
    return;
  }

  root.innerHTML = `
    <div class="routing-track">
      ${routing.map((s, i) => `
        <div class="step ${s.active ? "active" : ""}">
          <div class="circle">${escapeHtml(s.icon || "•")}</div>
          ${i < routing.length-1 ? `<div class="route-line"></div>` : ``}
          <div class="top">${escapeHtml(s.code || "-")}</div>
          <div class="place">${escapeHtml(s.place || "-")}</div>
          <div class="date">${escapeHtml(s.date || "-")}</div>
        </div>
      `).join("")}
    </div>
  `;
}

/* ===== TIMELINE ===== */
function buildTimeline(doc){
  // ✅ jika doc.events ada -> gunakan itu
  const events = pick(doc, ["events"]);
  if(Array.isArray(events) && events.length){
    return events.map(e => ({
      date: e.date || "-",
      location: e.location || "-",
      description: e.description || "-"
    }));
  }

  // ✅ jika tidak ada events -> generate lengkap
  const tsPort = resolveTsPort(doc);

  const stuffingDate = pick(doc, ["stuffingDate","master.stuffingDate","meta.stuffingDate"]);
  const etdPol = pick(doc, ["etdPol","master.etdPol","meta.etdPol"]);
  const etaTsPort = pick(doc, ["etaTsPort","master.etaTsPort","meta.etaTs","meta.etaTsPort"]);
  const etdTs = pick(doc, ["etdTs","shipment.etdTsPort","meta.etdTs","meta.etdTsPort"]);
  const destination = pick(doc, ["destination","shipment.destination","shipment.pod"]);
  const etaDest = pick(doc, ["etaDestination","shipment.etaPod","etaPod","meta.etaPod","meta.etaDestination"]);
  const inland = pick(doc, ["inland","shipment.inland","meta.inland"]);

  const t = [];

  if(!isEmptyDash(stuffingDate)){
    t.push({ date: stuffingDate, location:"SURABAYA", description:"STUFFING COMPLETED" });
  }
  if(!isEmptyDash(etdPol)){
    t.push({ date: etdPol, location:"SURABAYA", description:"DEPARTED POL" });
  }
  if(!isEmptyDash(etaTsPort)){
    t.push({ date: etaTsPort, location: tsPort, description:"ARRIVED TRANSSHIPMENT PORT" });
  }
  if(!isEmptyDash(etdTs)){
    t.push({ date: etdTs, location: tsPort, description:"DEPARTED TRANSSHIPMENT PORT" });
  }
  if(!isEmptyDash(etaDest)){
    t.push({
      date: etaDest,
      location: val(destination),
      description: doc.done ? "SHIPMENT RELEASED" : "ESTIMATED ARRIVAL DESTINATION"
    });
  }
  if(!isEmptyDash(inland)){
    t.push({ date:"-", location: inland, description:"INLAND DELIVERY" });
  }

  return t.length ? t : [{date:"-", location:"-", description:"No timeline data."}];
}

function renderTimeline(rows=[]){
  const body = $("timelineBody");

  if (!Array.isArray(rows) || rows.length === 0){
    body.innerHTML = `<tr><td colspan="3">Tidak ada event timeline.</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(ev => `
    <tr>
      <td>${escapeHtml(ev.date || "-")}</td>
      <td>${escapeHtml(ev.location || "-")}</td>
      <td>${escapeHtml(ev.description || "-")}</td>
    </tr>
  `).join("");
}

/* ===== PDF ===== */
function downloadPDF(){
  window.print();
}

/* ===== MAIN ===== */
let lastData = null;

async function track(){
  hideMsg();
  $("result").classList.add("hide");
  $("btnPdf").disabled = true;
  lastData = null;

  const bl = normalizeBL($("blInput").value);
  if (!bl){
    showMsg("Masukkan Nomor BL Gateway terlebih dahulu.", "warning");
    return;
  }

  setLoading(true);
  $("timelineBody").innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

  try{
    const doc = await fetchTrackingByBL(bl);

    if (!doc){
      showMsg("Nomor BL tidak ditemukan. Pastikan BL Gateway benar.", "warning");
      $("timelineBody").innerHTML = `<tr><td colspan="3">Data tidak ditemukan.</td></tr>`;
      return;
    }

    lastData = doc;

    renderHeader(doc, bl);
    renderRouting(buildRouting(doc));
    renderTimeline(buildTimeline(doc));

    $("result").classList.remove("hide");
    $("btnPdf").disabled = false;

    showMsg(`Data ditemukan ✅ BL: ${bl}`, "success");
  }catch(err){
    console.error(err);
    showMsg("Gagal mengambil data. Cek koneksi / rules Firestore.", "danger");
    $("timelineBody").innerHTML = `<tr><td colspan="3">Terjadi error.</td></tr>`;
  }finally{
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("btnTrack").addEventListener("click", track);

  $("btnPdf").addEventListener("click", ()=>{
    if(!lastData) return;
    downloadPDF();
  });

  $("blInput").addEventListener("keydown", (e)=>{
    if(e.key === "Enter") track();
  });

  $("blInput").focus();
});

/* ===== PRINT STYLE ===== */
const printStyle = document.createElement("style");
printStyle.innerHTML = `
@media print {
  body::before{ display:none !important; }
  .btn, .hint { display:none !important; }
  .overlay-box{ background:#fff !important; color:#000 !important; box-shadow:none !important; }
  table, th, td { color:#000 !important; border-color:#ccc !important; }
  .routing, .detail-box, .table-wrap { background:#fff !important; border-color:#ccc !important; }
}
`;
document.head.appendChild(printStyle);
