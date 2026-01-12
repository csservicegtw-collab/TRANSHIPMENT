import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

/* FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  authDomain: "transshipment-8c2da.firebaseapp.com",
  projectId: "transshipment-8c2da"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* STORAGE */
const MASTER_KEY = "cargo_sg_astro_master_v3";
const DATA_KEY   = "cargo_sg_astro_data_v3";

let master = JSON.parse(localStorage.getItem(MASTER_KEY)) || { mv:"", etaTs:"" };
let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

/* DOM */
const mv = document.getElementById("mv");
const etaTs = document.getElementById("etaTs");
const form = document.getElementById("blForm");
const tbody = document.getElementById("tableBody");
const btnSaveMaster = document.getElementById("btnSaveMaster");
const btnSearch = document.getElementById("btnSearch");

/* LOAD MASTER */
mv.value = master.mv || "";
etaTs.value = master.etaTs || "";

/* ===== DATE AUTO FORMAT (EXCEL STYLE) ===== */
function autoFormatDMY(value){
  if(!value) return "";
  let v = value.trim().replace(/[-.\s]/g,"/");
  const p = v.split("/").filter(Boolean);
  if(p.length < 3) return value;

  let d = (p[0]||"").replace(/\D/g,"").padStart(2,"0");
  let m = (p[1]||"").replace(/\D/g,"").padStart(2,"0");
  let y = (p[2]||"").replace(/\D/g,"");

  if(y.length === 2) y = "20"+y;
  if(y.length === 1) y = "200"+y;
  if(y.length !== 4) return value;

  return `${d}/${m}/${y}`;
}
function bindDateInputs(){
  document.querySelectorAll("input.date").forEach(input=>{
    input.addEventListener("blur", ()=> input.value = autoFormatDMY(input.value));
    input.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){
        input.value = autoFormatDMY(input.value);
      }
    });
  });
}
bindDateInputs();

/* UTILS */
function normalizeBL(bl){
  return (bl||"").trim().toUpperCase().replace(/\s+/g,"");
}
function saveLocal(){
  localStorage.setItem(MASTER_KEY, JSON.stringify(master));
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}

/* SAVE MASTER */
btnSaveMaster.addEventListener("click", ()=>{
  master.mv = (mv.value||"").trim().toUpperCase();
  master.etaTs = autoFormatDMY(etaTs.value);

  mv.value = master.mv;
  etaTs.value = master.etaTs;

  saveLocal();
  alert("MASTER DATA SAVED ✅");
  render();
});

/* RENDER */
function render(){
  tbody.innerHTML="";
  cargos.forEach(r=>{
    const tr = document.createElement("tr");
    if(r.done) tr.classList.add("done-row");

    tr.innerHTML = `
      <td>${r.bl}</td>
      <td>${r.destination}</td>
      <td>${master.etaTs || "-"}</td>
      <td>${r.etdTs}</td>
      <td>${r.etaPod}</td>
      <td>${master.mv || "-"}</td>
      <td>${r.connectVessel}</td>
      <td>${r.dr || ""}</td>
      <td>${r.cr || ""}</td>
      <td><input type="checkbox" ${r.done?"checked":""} data-id="${r.id}" class="chk"></td>
      <td>
        <div class="action">
          <span class="icon" data-act="edit" data-id="${r.id}" title="EDIT">✏️</span>
          <span class="icon" data-act="del" data-id="${r.id}" title="DELETE">🗑️</span>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // bind checkbox
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", async ()=>{
      const id = Number(cb.dataset.id);
      const row = cargos.find(x=>x.id===id);
      if(!row) return;
      row.done = !row.done;
      saveLocal();
      render();
      await publish(row); // update firebase status
    });
  });

  // bind actions
  tbody.querySelectorAll(".icon").forEach(ic=>{
    ic.addEventListener("click", async ()=>{
      const act = ic.dataset.act;
      const id = Number(ic.dataset.id);
      const row = cargos.find(x=>x.id===id);
      if(!row) return;

      if(act==="edit"){
        row.destination = (prompt("DESTINATION:", row.destination) || row.destination).trim().toUpperCase();
        row.etdTs = autoFormatDMY(prompt("ETD TS:", row.etdTs) || row.etdTs);
        row.etaPod = autoFormatDMY(prompt("ETA POD:", row.etaPod) || row.etaPod);
        row.connectVessel = (prompt("CONNECTING VESSEL:", row.connectVessel) || row.connectVessel).trim().toUpperCase();
        row.dr = autoFormatDMY(prompt("DO RELEASE:", row.dr || "") || row.dr || "");
        row.cr = autoFormatDMY(prompt("CARGO RELEASE:", row.cr || "") || row.cr || "");

        saveLocal();
        render();
        await publish(row);
      }

      if(act==="del"){
        if(!confirm("DELETE THIS DATA?")) return;
        cargos = cargos.filter(x=>x.id!==id);
        saveLocal();
        render();
        // optional: hapus firebase bisa ditambah nanti
      }
    });
  });
}

/* PUBLISH TO FIREBASE */
async function publish(row){
  const bl = normalizeBL(row.bl);
  if(!bl) return;

  const payload = {
    area:"singapore",
    agent:"astro",

    blNo: bl,
    destination: row.destination,
    motherVessel: master.mv || "-",
    etaTransshipmentPort: master.etaTs || "-",
    etdTs: row.etdTs,
    etaPod: row.etaPod,
    connectingVessel: row.connectVessel,
    dr: row.dr || "",
    cr: row.cr || "",
    status: row.done ? "SHIPMENT DONE" : "IN TRANSIT",

    updatedAt: new Date().toISOString().slice(0,10)
  };

  await setDoc(doc(db,"cargo_gateway",bl), payload, { merge:true });
}

/* FIX DOUBLE SUBMIT */
let isSaving = false;
form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(isSaving) return;
  isSaving = true;

  // MASTER REQUIRED
  if(!master.mv || !master.etaTs){
    alert("PLEASE INPUT MASTER DATA FIRST!");
    isSaving = false;
    return;
  }

  const bl = normalizeBL(document.getElementById("bl").value);
  const destination = document.getElementById("destination").value.trim().toUpperCase();
  const etdTs = autoFormatDMY(document.getElementById("etdTs").value);
  const etaPod = autoFormatDMY(document.getElementById("etaPod").value);
  const connectVessel = document.getElementById("connectVessel").value.trim().toUpperCase();
  const dr = autoFormatDMY(document.getElementById("dr").value);
  const cr = autoFormatDMY(document.getElementById("cr").value);

  if(!bl){ alert("BL REQUIRED!"); isSaving=false; return; }

  // prevent duplicate BL
  if(cargos.some(x=>normalizeBL(x.bl)===bl)){
    alert("BL ALREADY EXISTS. PLEASE EDIT.");
    isSaving=false;
    return;
  }

  const row = {
    id: Date.now(),
    bl,
    destination,
    etdTs,
    etaPod,
    connectVessel,
    dr,
    cr,
    done:false
  };

  // ✅ newest on top
  cargos.unshift(row);

  saveLocal();
  render();

  // reset after render (smooth)
  form.reset();

  await publish(row);

  isSaving = false;
});

/* SEARCH BL */
btnSearch.addEventListener("click", ()=>{
  const q = prompt("SEARCH BL NO:");
  if(!q) return;
  const key = normalizeBL(q);
  const found = cargos.find(x=>normalizeBL(x.bl)===key);
  if(!found) return alert("NOT FOUND");

  alert(`FOUND ✅\nBL: ${found.bl}\nDEST: ${found.destination}\nSTATUS: ${found.done ? "SHIPMENT DONE" : "IN TRANSIT"}`);
});

/* LOGIN */
window.checkLogin = ()=>{
  if(!localStorage.getItem("loginStatus")){
    alert("PLEASE LOGIN FIRST.");
    window.location.href = "../../../index.html";
  }
};

/* INIT */
render();
