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
function valOrDash(v){
  const s = (v ?? "").toString().trim();
  return s ? s : "-";
}
function todayDDMMYYYY(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
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

/* ===== HEADER RENDER ===== */
function renderHeader(doc, bl){
  $("statusText").textContent = doc.done ? "SHIPMENT RELEASED" : "IN TRANSIT";
  $("updatedText").textContent = valOrDash(doc.updatedAt || todayDDMMYYYY());

  $("originText").textContent = "SURABAYA";
  $("destText").textContent = valOrDash(doc.destination);

  $("mvText").textContent = valOrDash(doc.motherVessel);
  $("connectText").textContent = valOrDash(doc.connectingVessel);

  $("stuffingText").textContent = valOrDash(doc.stuffingDate);
  $("etdPolText").textContent = valOrDash(doc.etdPol);

  $("etaTsText").textContent = valOrDash(doc.etaTsPort);
  $("etdTsText").textContent = valOrDash(doc.etdTs);

  $("etaDestText").textContent = valOrDash(doc.etaDestination);
  $("inlandText").textContent = valOrDash(doc.inland);

  $("blText").textContent = doc.blNo || doc.bl || bl;
}

/* ===== ROUTING ===== */
function buildRouting(doc){
  const inland = valOrDash(doc.inland);
  const hasInland = inland !== "-" && inland !== "";

  return [
    { code:"POL", place:"SURABAYA", date: valOrDash(doc.etdPol), icon:"🏁", active:true },
    { code:"TS", place:"TRANSSHIPMENT PORT", date: valOrDash(doc.etaTsPort), icon:"🚢", active: !!doc.etaTsPort },
    { code:"ETD TS", place:"TRANSSHIPMENT PORT", date: valOrDash(doc.etdTs), icon:"⛴️", active: !!doc.etdTs },
    { code:"POD", place: valOrDash(doc.destination), date: valOrDash(doc.etaDestination), icon:"📦", active: !!doc.etaDestination },
    { code:"INLAND", place: inland, date:"-", icon:"🏬", active: hasInland }
  ];
}

function renderRouting(routing=[]){
  const root = $("routingBar");
  if (!Array.isArray(routing) || routing.length === 0){
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
function buildEvents(doc){
  const ev = [];
  if(doc.stuffingDate) ev.push({ date: doc.stuffingDate, location:"SURABAYA", description:"STUFFING COMPLETED" });
  if(doc.etdPol) ev.push({ date: doc.etdPol, location:"SURABAYA", description:"DEPARTED POL" });
  if(doc.etaTsPort) ev.push({ date: doc.etaTsPort, location:"TRANSSHIPMENT PORT", description:"ARRIVED TS PORT" });
  if(doc.etdTs) ev.push({ date: doc.etdTs, location:"TRANSSHIPMENT PORT", description:"DEPARTED TS PORT" });

  if(doc.etaDestination){
    ev.push({
      date: doc.etaDestination,
      location: valOrDash(doc.destination),
      description: doc.done ? "SHIPMENT RELEASED" : "ESTIMATED ARRIVAL POD"
    });
  }

  if(doc.inland && doc.inland !== "-") ev.push({ date:"-", location: doc.inland, description:"INLAND DELIVERY" });
  return ev;
}

function renderTimeline(events=[]){
  const body = $("timelineBody");

  if (!Array.isArray(events) || events.length === 0){
    body.innerHTML = `<tr><td colspan="3">Tidak ada event timeline.</td></tr>`;
    return;
  }

  body.innerHTML = events.map(ev => `
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
    renderTimeline(buildEvents(doc));

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
    if (!lastData) return;
    downloadPDF();
  });

  $("blInput").addEventListener("keydown", (e)=>{
    if (e.key === "Enter") track();
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
