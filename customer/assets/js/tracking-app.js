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
  $("msg").className = "msg";
}

function setLoading(v){
  $("btnTrack").disabled = v;
  $("btnTrack").textContent = v ? "Loading..." : "Track";
}

function clean(v){
  const s=(v??"").toString().trim();
  return s||"-";
}

/* HEADER + DETAIL */
function renderHeader(data, bl){
  $("sectionTitle").textContent = "Transshipment Tracking";

  $("blText").textContent = clean(data.blNo||bl);
  $("originText").textContent = clean(data.origin||"SURABAYA");
  $("destText").textContent = clean(data.destination);

  $("mvText").textContent = clean(data.mv);
  $("stuffingText").textContent = clean(data.stuffing);
  $("connectText").textContent = clean(data.connectingVessel);

  $("etdPolText").textContent = clean(data.etdPol);
  $("etaTsText").textContent = clean(data.etaTs);
  $("etdTsText").textContent = clean(data.etdTs);
  $("etaDestText").textContent = clean(data.etaDestination);

  $("inlandText").textContent = clean(data.inland);
  $("doReleaseText").textContent = clean(data.doRelease);
  $("cargoReleaseText").textContent = clean(data.cargoRelease);
}

/* MAIN */
let lastData=null;

async function track(){
  hideMsg();
  $("result").classList.add("hide");
  $("btnPdf").disabled=true;

  const bl=normalizeBL($("blInput").value);
  if(!bl){showMsg("Masukkan Nomor BL Gateway terlebih dahulu.","warning");return;}

  setLoading(true);

  try{
    const data=await fetchTrackingByBL(bl);
    if(!data){showMsg("Nomor BL tidak ditemukan.","warning");return;}

    lastData=data;
    renderHeader(data,bl);

    $("result").classList.remove("hide");
    $("btnPdf").disabled=false;
    showMsg(`Data ditemukan ✅ BL: ${bl}`,"success");

  }catch(e){
    console.error(e);
    showMsg("Gagal mengambil data.","danger");
  }finally{
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  $("btnTrack").addEventListener("click",track);
  $("blInput").addEventListener("keydown",e=>{if(e.key==="Enter")track();});
  $("btnPdf").addEventListener("click",()=>window.print());
  $("blInput").focus();
});
