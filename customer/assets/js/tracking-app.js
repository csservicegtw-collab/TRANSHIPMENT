import { fetchTrackingByBL, normalizeBL } from "./tracking-source.js";

const $ = (id) => document.getElementById(id);

function escapeHtml(str="") {
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
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

/* ===== Routing + Events Generator ===== */
function buildRouting(data){
  const steps = [];

  steps.push({ code:"POL", place:"SURABAYA", date:data.etdPol || "-", icon:"🏁", active:true });

  const tsPlace = (data.etaTsPort && data.etaTsPort !== "-") ? "TS PORT" : "TS PORT";
  steps.push({ code:"TS", place: tsPlace, date:data.etaTsPort || "-", icon:"🚢", active:true });

  steps.push({ code:"POD", place:data.destination || "-", date:data.etaDestination || "-", icon:"📦", active: true });

  steps.push({ code:"INLAND", place:data.inland || "-", date:"-", icon:"🏬", active: (data.inland && data.inland !== "-" ) });

  return steps;
}

function buildEvents(data){
  const events = [];

  if(data.stuffingDate && data.stuffingDate !== "-"){
    events.push({ date:data.stuffingDate, location:"SURABAYA", description:"STUFFING COMPLETED" });
  }
  if(data.etdPol && data.etdPol !== "-"){
    events.push({ date:data.etdPol, location:"SURABAYA", description:"DEPARTED POL" });
  }
  if(data.etaTsPort && data.etaTsPort !== "-"){
    events.push({ date:data.etaTsPort, location:"TS PORT", description:"ARRIVED TRANSSHIPMENT PORT" });
  }
  if(data.etdTsPort && data.etdTsPort !== "-"){
    events.push({ date:data.etdTsPort, location:"TS PORT", description:"DEPARTED TRANSSHIPMENT PORT" });
  }
  if(data.etaDestination && data.etaDestination !== "-"){
    events.push({ date:data.etaDestination, location:data.destination || "POD", description:"ESTIMATED ARRIVAL POD" });
  }

  if(data.done){
    events.push({ date:"-", location:data.destination || "POD", description:"SHIPMENT DONE" });
  }

  return events;
}

/* ===== Render ===== */
function renderHeader(data, bl){
  $("statusText").textContent = data.done ? "SHIPMENT DONE" : "IN TRANSIT";
  $("updatedText").textContent = data.updatedAt || "-";
  $("originText").textContent = data.origin || "-";
  $("destText").textContent = data.destination || "-";

  $("mvText").textContent = data.motherVessel || "-";
  $("cvText").textContent = data.connectingVessel || "-";

  $("stuffingText").textContent = data.stuffingDate || "-";
  $("etdPolText").textContent = data.etdPol || "-";
  $("etaTsText").textContent = data.etaTsPort || "-";
  $("etdTsText").textContent = data.etdTsPort || "-";
  $("etaDestText").textContent = data.etaDestination || "-";
  $("inlandText").textContent = data.inland || "-";
  $("drText").textContent = data.doRelease || "-";
  $("crText").textContent = data.cargoRelease || "-";

  $("containerText").textContent = data.containerNo || "-";
  $("blText").textContent = data.blNo || bl;
}

function renderRouting(routing=[]){
  const root = $("routingBar");
  if (!Array.isArray(routing) || routing.length === 0){
    root.innerHTML = `<div style="opacity:.85;padding:10px;">Routing belum tersedia.</div>`;
    return;
  }

  root.innerHTML = `
    <div class="routing-track">
      ${routing.map(s => `
        <div class="step ${s.active ? "active" : ""}">
          <div class="circle">${escapeHtml(s.icon || "•")}</div>
          <div class="top">${escapeHtml(s.code || "-")}</div>
          <div class="place">${escapeHtml(s.place || "-")}</div>
          <div class="date">${escapeHtml(s.date || "-")}</div>
        </div>
      `).join("")}
    </div>
  `;
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

/* ===== Main ===== */
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
    const data = await fetchTrackingByBL(bl);

    if (!data){
      showMsg("Nomor BL tidak ditemukan. Pastikan BL Gateway benar.", "warning");
      $("timelineBody").innerHTML = `<tr><td colspan="3">Data tidak ditemukan.</td></tr>`;
      return;
    }

    lastData = data;

    renderHeader(data, bl);

    const routing = buildRouting(data);
    const events = buildEvents(data);

    renderRouting(routing);
    renderTimeline(events);

    $("result").classList.remove("hide");
    $("btnPdf").disabled = false;

    showMsg(`Data ditemukan ✅ Nomor BL: ${bl}`, "success");
  }catch(err){
    console.error(err);
    showMsg("Gagal mengambil data. Cek koneksi internet.", "danger");
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

/* Print styling */
const printStyle = document.createElement("style");
printStyle.innerHTML = `
@media print {
  body::before{ display:none !important; }
  .btn, .hint { display:none !important; }
  .overlay-box{ background:#fff !important; color:#000 !important; box-shadow:none !important; }
  .title, .subtitle{ color:#000 !important; text-shadow:none !important; }
  table, th, td { color:#000 !important; border-color:#ccc !important; }
  .routing, .detail-box, .table-wrap { background:#fff !important; border-color:#ccc !important; }
  .value, .label { color:#000 !important; }
}
`;
document.head.appendChild(printStyle);
