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

/* MAIN */
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

  try{
    const data = await fetchTrackingByBL(bl);

    if (!data){
      showMsg("Nomor BL tidak ditemukan. Pastikan BL Gateway benar.", "warning");
      return;
    }

    lastData = data;

    renderHeader(data, bl);

    // ✅ rename title only
    document.querySelector(".section-title").textContent = "Transshipment Tracking";

    $("result").classList.remove("hide");
    $("btnPdf").disabled = false;

    showMsg(`Data ditemukan ✅ BL: ${bl}`, "success");
  }catch(err){
    console.error(err);
    showMsg("Gagal mengambil data. Cek koneksi internet / rules Firestore.", "danger");
  }finally{
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("btnTrack").addEventListener("click", track);
  $("btnPdf").addEventListener("click", ()=>{ if(lastData) window.print(); });
  $("blInput").addEventListener("keydown", (e)=>{ if (e.key === "Enter") track(); });
  $("blInput").focus();
});
