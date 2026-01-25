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

/* ===== Helpers ===== */
function clean(v){
  const s = (v ?? "").toString().trim();
  if(!s) return "-";
  if(s === "-") return "-";
  return s;
}
function hasValue(v){
  const s = (v ?? "").toString().trim();
  return !!s && s !== "-";
}


function renderHeader(data, bl){
  // data field (new schema)
  const origin = clean(data.origin || "SURABAYA");
  const dest = clean(data.destination || data.shipment?.destination);

  const mv = clean(data.mv || data.master?.motherVessel);
  const stuffing = clean(data.stuffing || data.master?.stuffingDate);

  const etdPol = clean(data.etdPol || data.master?.etdPol);
  const etaTs = clean(data.etaTs || data.master?.etaTsPort);
  const tsPort = clean(data.tsPort || data.master?.tsPort);

  const etdTs = clean(data.etdTs || data.shipment?.etdTsPort);
  const etaDest = clean(data.etaDestination || data.shipment?.etaPod);

  const inland = clean(data.inland || data.shipment?.inland);

  const connecting = clean(data.connectingVessel || data.shipment?.connectingVessel);

  const dr = clean(data.doRelease || data.shipment?.doRelease);
  const cr = clean(data.cargoRelease || data.shipment?.cargoRelease);

  $("statusText").textContent  = clean(data.status || "-");
  $("updatedText").textContent = clean(data.updatedAt || "-");

  $("originText").textContent = origin;
  $("destText").textContent   = dest;

  $("blText").textContent = clean(data.blNo || bl);

  // ✅ NEW fields
  $("tsPortText").textContent = tsPort;
  $("mvText").textContent = mv;
  $("stuffingText").textContent = stuffing;
  $("connectText").textContent = connecting;

  $("etdPolText").textContent = etdPol;
  $("etaTsText").textContent  = etaTs;
  $("etdTsText").textContent  = etdTs;
  $("etaDestText").textContent = etaDest;

  $("inlandText").textContent = inland;

  $("doReleaseText").textContent = dr;
  $("cargoReleaseText").textContent = cr;
}

/* ===== Routing ===== */
function renderRouting(data){
  const root = $("routingBar");

  const origin = clean(data.origin || "SURABAYA");
  const dest = clean(data.destination || data.shipment?.destination);
  const tsPort = clean(data.tsPort || data.master?.tsPort || "SINGAPORE");

  const etdPol = clean(data.etdPol || data.master?.etdPol);
  const etaTs = clean(data.etaTs || data.master?.etaTsPort);
  const etdTs = clean(data.etdTs || data.shipment?.etdTsPort);
  const etaDest = clean(data.etaDestination || data.shipment?.etaPod);
  const inland = clean(data.inland || data.shipment?.inland);

  const done = !!data.done;

  // ✅ Build routing steps
  const routing = [
    { code:"POL", place: origin, date: etdPol, icon:"🏁", active:true },
    { code:"TS", place: tsPort, date: etaTs, icon:"🚢", active:true },
    { code:"POD", place: dest, date: etaDest, icon:"📦", active:true },
  ];

  // ✅ Inland only if exists
  if(hasValue(inland)){
    routing.push({
      code:"INLAND",
      place: inland,
      date: done ? clean(data.updatedAt || "-") : "-",
      icon:"🏬",
      active: done
    });
  }

  root.innerHTML = `
    <div class="routing-track">
      ${routing.map((s, idx) => `
        <div class="step ${s.active ? "active" : ""}">
          <div class="circle">${escapeHtml(s.icon || "•")}</div>
          <div class="top">${escapeHtml(s.code || "-")}</div>
          <div class="place">${escapeHtml(s.place || "-")}</div>
          <div class="date">${escapeHtml(s.date || "-")}</div>
          ${idx < routing.length-1 ? `<div class="connector"></div>` : ``}
        </div>
      `).join("")}
    </div>
  `;
}

/* ===== Timeline (✅ DR / CR conditional like inland) ===== */
function buildTimeline(data){
  const origin = clean(data.origin || "SURABAYA");
  const dest = clean(data.destination || data.shipment?.destination);
  const tsPort = clean(data.tsPort || data.master?.tsPort || "SINGAPORE");

  const stuffing = clean(data.stuffing || data.master?.stuffingDate);
  const etdPol = clean(data.etdPol || data.master?.etdPol);
  const etaTs = clean(data.etaTs || data.master?.etaTsPort);
  const etdTs = clean(data.etdTs || data.shipment?.etdTsPort);
  const etaDest = clean(data.etaDestination || data.shipment?.etaPod);

  const inland = clean(data.inland || data.shipment?.inland);
  const dr = clean(data.doRelease || data.shipment?.doRelease);
  const cr = clean(data.cargoRelease || data.shipment?.cargoRelease);

  const events = [];

  if(hasValue(stuffing)){
    events.push({ date: stuffing, location: origin, description: "STUFFING COMPLETED" });
  }

  if(hasValue(etdPol)){
    events.push({ date: etdPol, location: origin, description: "DEPARTED POL" });
  }

  if(hasValue(etaTs)){
    events.push({ date: etaTs, location: tsPort, description: "ARRIVED TRANSSHIPMENT PORT" });
  }

  if(hasValue(etdTs)){
    events.push({ date: etdTs, location: tsPort, description: "DEPARTED TRANSSHIPMENT PORT" });
  }

  if(hasValue(etaDest)){
    events.push({ date: etaDest, location: dest, description: "ESTIMATED ARRIVAL DESTINATION" });
  }

  // ✅ Inland timeline only if exists
  if(hasValue(inland)){
    events.push({ date: "-", location: inland, description: "INLAND DELIVERY" });
  }

  // ✅ DR timeline only if exists
  if(hasValue(dr)){
    events.push({ date: dr, location: dest, description: "DO RELEASE" });
  }

  // ✅ CR timeline only if exists
  if(hasValue(cr)){
    events.push({ date: cr, location: dest, description: "CARGO RELEASE" });
  }

  return events;
}

function renderTimeline(events=[]){
  const body = $("timelineBody");

  if(!Array.isArray(events) || events.length === 0){
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
    renderRouting(data);

    // ✅ timeline auto build (DR/CR only if exists)
    const timeline = buildTimeline(data);
    renderTimeline(timeline);

    $("result").classList.remove("hide");
    $("btnPdf").disabled = false;

    showMsg(`Data ditemukan ✅ BL: ${bl}`, "success");
  }catch(err){
    console.error(err);
    showMsg("Gagal mengambil data. Cek koneksi internet / rules Firestore.", "danger");
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
