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

/* ============================================================
   SAFE VALUE GETTER:
   bisa baca root maupun nested (master / shipment)
   ============================================================ */
function pick(data, paths=[], fallback="-"){
  for(const p of paths){
    const parts = p.split(".");
    let cur = data;
    let ok = true;
    for(const k of parts){
      if(cur && Object.prototype.hasOwnProperty.call(cur,k)){
        cur = cur[k];
      }else{
        ok=false; break;
      }
    }
    if(ok && cur !== undefined && cur !== null && String(cur).trim() !== ""){
      return cur;
    }
  }
  return fallback;
}

/* ===== Routing + Events Generator ===== */
function buildRouting(d){
  const steps = [];

  const etdPol = pick(d, ["etdPol","master.etdPol"], "-");
  const etaTs = pick(d, ["etaTsPort","master.etaTsPort","etaTs","master.etaTs"], "-");
  const tsPort = pick(d, ["master.tsPort","tsPort"], "TS PORT");

  const dest = pick(d, ["destination","shipment.destination","pod","shipment.pod"], "-");
  const etaDest = pick(d, ["etaDestination","shipment.etaDestination","etaPod","shipment.etaPod"], "-");
  const inland = pick(d, ["inland","shipment.inland"], "-");

  steps.push({ code:"POL", place:"SURABAYA", date:etdPol, icon:"🏁", active:true });
  steps.push({ code:"TS", place:tsPort, date:etaTs, icon:"🚢", active:true });
  steps.push({ code:"POD", place:dest, date:etaDest, icon:"📦", active:true });
  steps.push({ code:"INLAND", place:inland, date:"-", icon:"🏬", active:(inland && inland !== "-" ) });

  return steps;
}

function buildEvents(d){
  const events = [];

  const stuffing = pick(d, ["stuffingDate","master.stuffingDate"], "-");
  const etdPol = pick(d, ["etdPol","master.etdPol"], "-");
  const etaTs = pick(d, ["etaTsPort","master.etaTsPort","etaTs","master.etaTs"], "-");
  const etdTs = pick(d, ["etdTsPort","shipment.etdTsPort","etdTs","shipment.etdTs"], "-");
  const dest = pick(d, ["destination","shipment.destination"], "POD");
  const etaDest = pick(d, ["etaDestination","shipment.etaDestination","etaPod","shipment.etaPod"], "-");

  if(stuffing !== "-") events.push({ date:stuffing, location:"SURABAYA", description:"STUFFING COMPLETED" });
  if(etdPol !== "-") events.push({ date:etdPol, location:"SURABAYA", description:"DEPARTED POL" });
  if(etaTs !== "-") events.push({ date:etaTs, location:"TS PORT", description:"ARRIVED TRANSSHIPMENT PORT" });
  if(etdTs !== "-") events.push({ date:etdTs, location:"TS PORT", description:"DEPARTED TRANSSHIPMENT PORT" });
  if(etaDest !== "-") events.push({ date:etaDest, location:dest, description:"ESTIMATED ARRIVAL POD" });

  const done = pick(d, ["done"], false);
  if(done === true) events.push({ date:"-", location:dest, description:"SHIPMENT DONE" });

  return events;
}

/* ===== Render ===== */
function renderHeader(d, bl){
  const done = pick(d, ["done"], false);
  $("statusText").textContent = done ? "SHIPMENT DONE" : "IN TRANSIT";
  $("lastStatusText").textContent = done ? "DELIVERED" : "IN TRANSIT";

  $("updatedText").textContent = pick(d, ["updatedAt"], "-");
  $("originText").textContent = pick(d, ["origin"], "SURABAYA");

  $("destText").textContent = pick(d, ["destination","shipment.destination"], "-");

  $("mvText").textContent = pick(d, ["motherVessel","master.motherVessel","mv","master.mv"], "-");
  $("cvText").textContent = pick(d, ["connectingVessel","shipment.connectingVessel","connectVessel","shipment.connectVessel"], "-");

  $("stuffingText").textContent = pick(d, ["stuffingDate","master.stuffingDate"], "-");
  $("etdPolText").textContent = pick(d, ["etdPol","master.etdPol"], "-");
  $("etaTsText").textContent = pick(d, ["etaTsPort","master.etaTsPort","etaTs","master.etaTs"], "-");
  $("etdTsText").textContent = pick(d, ["etdTsPort","shipment.etdTsPort","etdTs","shipment.etdTs"], "-");

  $("etaDestText").textContent = pick(d, ["etaDestination","shipment.etaDestination","etaPod","shipment.etaPod"], "-");

  /* ✅ INLAND, DR, CR selalu muncul walau kosong */
  $("inlandText").textContent = pick(d, ["inland","shipment.inland"], "-");
  $("drText").textContent = pick(d, ["doRelease","shipment.doRelease","dr","shipment.dr"], "-");
  $("crText").textContent = pick(d, ["cargoRelease","shipment.cargoRelease","cr","shipment.cr"], "-");

  $("blText").textContent = pick(d, ["blNo"], bl);
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

    const routing = Array.isArray(data.routing) && data.routing.length
      ? data.routing
      : buildRouting(data);

    const events = Array.isArray(data.events) && data.events.length
      ? data.events
      : buildEvents(data);

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
