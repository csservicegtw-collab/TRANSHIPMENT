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

function renderHeader(data, bl){
  $("statusText").textContent = data.status || "-";
  $("updatedText").textContent = data.updatedAt || "-";
  $("originText").textContent = data.origin || "-";
  $("destText").textContent = data.destination || "-";
  $("vesselText").textContent = data.vessel || "-";
  $("etaText").textContent = data.eta || "-";
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

function downloadPDF(){ window.print(); }

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
    renderRouting(data.routing || []);
    renderTimeline(data.events || []);

    $("result").classList.remove("hide");
    $("btnPdf").disabled = false;

    showMsg(`Data ditemukan ✅ Nomor BL: ${bl}`, "success");
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
  $("btnPdf").addEventListener("click", ()=> lastData && downloadPDF());

  $("blInput").addEventListener("keydown", (e)=>{
    if (e.key === "Enter") track();
  });

  $("blInput").focus();
});

// Print styling
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
