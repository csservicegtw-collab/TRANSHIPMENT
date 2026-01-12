import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  projectId: "transshipment-8c2da"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MASTER_KEY = "sg_astro_master";
const DATA_KEY = "sg_astro_bl";

let master = JSON.parse(localStorage.getItem(MASTER_KEY)) || {};
let data = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const body = document.getElementById("tableBody");

/* DATE AUTO FORMAT */
function fmt(v){
  if(!v) return "";
  let p=v.replace(/[-.\s]/g,"/").split("/");
  if(p.length<3) return v;
  let d=p[0].padStart(2,"0");
  let m=p[1].padStart(2,"0");
  let y=p[2].length===2?"20"+p[2]:p[2];
  return `${d}/${m}/${y}`;
}

/* MASTER */
window.saveMaster=()=>{
  master={
    mv:document.getElementById("mv").value.toUpperCase(),
    etaTs:fmt(document.getElementById("etaTs").value)
  };
  localStorage.setItem(MASTER_KEY,JSON.stringify(master));
  alert("MASTER SAVED");
  render();
};

/* BL INPUT */
document.getElementById("blForm").onsubmit=async e=>{
  e.preventDefault();
  if(!master.mv||!master.etaTs){
    alert("PLEASE INPUT MASTER DATA FIRST");
    return;
  }

  const row={
    id:Date.now(),
    bl:bl.value.toUpperCase(),
    dest:destination.value.toUpperCase(),
    etdTs:fmt(etdTs.value),
    etaPod:fmt(etaPod.value),
    connect:connectVessel.value.toUpperCase(),
    dr:fmt(dr.value),
    cr:fmt(cr.value),
    done:false
  };

  data.unshift(row);
  localStorage.setItem(DATA_KEY,JSON.stringify(data));
  await publish(row);
  blForm.reset();
  render();
};

/* RENDER */
function render(){
  body.innerHTML="";
  data.forEach(r=>{
    const tr=document.createElement("tr");
    if(r.done) tr.classList.add("done");
    tr.innerHTML=`
      <td>${r.bl}</td>
      <td>${r.dest}</td>
      <td>${master.etaTs}</td>
      <td>${r.etdTs}</td>
      <td>${r.etaPod}</td>
      <td>${master.mv}</td>
      <td>${r.connect}</td>
      <td>${r.dr}</td>
      <td>${r.cr}</td>
      <td><input type="checkbox" ${r.done?"checked":""} onclick="toggle(${r.id})"></td>
      <td>
        <span class="action-btn" onclick="edit(${r.id})">✏️</span>
        <span class="action-btn" onclick="del(${r.id})">🗑️</span>
      </td>
    `;
    body.appendChild(tr);
  });
}
render();

/* ACTIONS */
window.toggle=id=>{
  const r=data.find(x=>x.id===id);
  r.done=!r.done;
  localStorage.setItem(DATA_KEY,JSON.stringify(data));
  render();
};

window.edit=id=>{
  const r=data.find(x=>x.id===id);
  r.dest=prompt("DEST",r.dest)||r.dest;
  r.etdTs=fmt(prompt("ETD TS",r.etdTs)||r.etdTs);
  r.etaPod=fmt(prompt("ETA POD",r.etaPod)||r.etaPod);
  r.connect=prompt("CONNECTING VESSEL",r.connect)||r.connect;
  r.dr=fmt(prompt("DR",r.dr)||r.dr);
  r.cr=fmt(prompt("CR",r.cr)||r.cr);
  localStorage.setItem(DATA_KEY,JSON.stringify(data));
  render();
};

window.del=id=>{
  if(confirm("DELETE?")){
    data=data.filter(x=>x.id!==id);
    localStorage.setItem(DATA_KEY,JSON.stringify(data));
    render();
  }
};

/* FIREBASE */
async function publish(r){
  await setDoc(doc(db,"cargo_gateway",r.bl),{
    bl:r.bl,
    destination:r.dest,
    motherVessel:master.mv,
    etaTransshipmentPort:master.etaTs,
    etdTs:r.etdTs,
    etaPod:r.etaPod,
    connectingVessel:r.connect,
    dr:r.dr,
    cr:r.cr,
    status:r.done?"DONE":"IN TRANSIT"
  });
}

window.checkLogin=()=>{
  if(!localStorage.getItem("loginStatus")){
    location.href="../../../index.html";
  }
};
