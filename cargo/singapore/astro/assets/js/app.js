/* ==============================
   STORAGE
================================ */
const MASTER_LIST_KEY = "sg_astro_masters_excel_v2";
const ACTIVE_MASTER_KEY = "sg_astro_active_master_id_v2";
const DATA_KEY = "sg_astro_cargos_excel_v2";

let masters = JSON.parse(localStorage.getItem(MASTER_LIST_KEY)) || [];
let cargos  = JSON.parse(localStorage.getItem(DATA_KEY)) || [];
let activeMasterId = localStorage.getItem(ACTIVE_MASTER_KEY) || "";

/* ==============================
   DOM
================================ */
const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const searchAll = document.getElementById("searchAll");

/* master inputs */
const mvInp = document.getElementById("mv");
const etdPolInp = document.getElementById("etdPol");
const etaTsInp = document.getElementById("etaTs");
const stuffingDateInp = document.getElementById("stuffingDate");
const btnSaveMaster = document.getElementById("btnSaveMaster");
const masterInfo = document.getElementById("masterInfo");

/* ==============================
   HELPERS
================================ */
function saveLocal(){
  localStorage.setItem(MASTER_LIST_KEY, JSON.stringify(masters));
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
  localStorage.setItem(ACTIVE_MASTER_KEY, activeMasterId || "");
}

function normalizeBL(v){
  return (v||"").toString().trim().toUpperCase().replace(/\s+/g,"");
}

/* date format only on blur */
function parseAndFormatDate(raw){
  if(!raw) return "";
  let v = String(raw).trim();
  if(!v) return "";

  v = v.replace(/[.\-\s]+/g, "/");
  v = v.replace(/\/+/g, "/");

  const parts = v.split("/").filter(Boolean);
  if(parts.length < 3) return raw;

  let d = (parts[0]||"").replace(/\D/g,"");
  let m = (parts[1]||"").replace(/\D/g,"");
  let y = (parts[2]||"").replace(/\D/g,"");

  if(!d||!m||!y) return raw;
  d = d.padStart(2,"0");
  m = m.padStart(2,"0");
  if(y.length===2) y="20"+y;
  if(y.length!==4) return raw;

  return `${d}/${m}/${y}`;
}

function bindDateInput(inp){
  if(!inp) return;
  const doFormat=()=>{
    const f=parseAndFormatDate(inp.value);
    if(f && f!==inp.value) inp.value=f;
  };
  inp.addEventListener("blur", doFormat);
}

document.querySelectorAll("input.date").forEach(bindDateInput);

function getMasterById(id){
  return masters.find(m => m.id === id) || null;
}

function setActiveMasterUI(){
  const m = getMasterById(activeMasterId);
  if(!m){
    masterInfo.innerHTML = `ACTIVE MASTER: <span class="badge">NOT SET</span>`;
    return;
  }
  masterInfo.innerHTML = `ACTIVE MASTER: <span class="badge">${m.mv}</span>`;
}

/* ==============================
   MASTER SAVE (CREATE NEW MASTER BATCH)
================================ */
btnSaveMaster.addEventListener("click", ()=>{
  const mv = mvInp.value.trim().toUpperCase();
  const etdPol = parseAndFormatDate(etdPolInp.value);
  const etaTs = parseAndFormatDate(etaTsInp.value);
  const stuffingDate = parseAndFormatDate(stuffingDateInp.value);

  if(!mv || !etdPol || !etaTs || !stuffingDate){
    alert("PLEASE COMPLETE MASTER DATA!");
    return;
  }

  // ✅ create NEW MASTER (batch)
  const masterId = String(Date.now());
  const newMaster = { id: masterId, mv, etdPol, etaTs, stuffingDate };

  masters.unshift(newMaster);
  activeMasterId = masterId;

  // sync UI
  mvInp.value = mv;
  etdPolInp.value = etdPol;
  etaTsInp.value = etaTs;
  stuffingDateInp.value = stuffingDate;

  saveLocal();
  setActiveMasterUI();
  render();
});

/* ==============================
   INLINE EDIT
================================ */
function setCellEditable(td, rowId, field, opts={}){
  const {isDate=false,isBL=false}=opts;

  td.classList.add("editable");

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const row = cargos.find(x=>x.id===rowId);
    if(!row) return;

    const old=td.textContent.trim();
    const input=document.createElement("input");
    input.value=old;

    input.style.width="100%";
    input.style.height="26px";
    input.style.border="1px solid #cfcfcf";
    input.style.padding="0 6px";
    input.style.fontSize="12px";

    td.innerHTML="";
    td.appendChild(input);
    input.focus();
    input.select();

    if(isDate) bindDateInput(input);

    const commit=()=>{
      let val=input.value.trim();

      if(isBL){
        val=normalizeBL(val);
        if(!val){
          td.innerHTML=row.bl;
          return;
        }
        const dup = cargos.some(x => x.id!==rowId && normalizeBL(x.bl)===val);
        if(dup){
          alert("BL ALREADY EXISTS!");
          td.innerHTML=row.bl;
          return;
        }
      }

      if(isDate) val=parseAndFormatDate(val);

      row[field]=val;
      saveLocal();
      td.innerHTML=val;
      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter") commit();
      if(e.key==="Escape") td.innerHTML=old;
    });
  });
}

/* ==============================
   SEARCH (GLOBAL)
================================ */
function matchSearch(row){
  const q=(searchAll.value||"").toLowerCase().trim();
  if(!q) return true;

  const m = getMasterById(row.masterId) || {};
  const blob = [
    row.bl,
    row.destination,
    row.etdTs,
    row.etaDestination,
    row.connectingVessel,
    row.doRelease,
    row.cargoRelease,
    row.inland,
    m.mv,
    m.etdPol,
    m.etaTs,
    m.stuffingDate
  ].join(" ").toLowerCase();

  return blob.includes(q);
}

/* ==============================
   FILTER EXCEL STYLE
================================ */
const filters = {}; // key -> selected value

function normalizeDoneLabel(v){
  if(v === true) return "DONE";
  return "NOT DONE";
}

function getColumnValueForFilter(row, key){
  const m = getMasterById(row.masterId) || {};

  if(key === "masterMv") return (m.mv || "");
  if(key === "masterEtaTs") return (m.etaTs || "");
  if(key === "done") return normalizeDoneLabel(!!row.done);

  return (row[key] ?? "");
}

function matchFilters(row){
  for(const key in filters){
    const selected = filters[key];
    if(!selected || selected === "ALL") continue;

    const val = String(getColumnValueForFilter(row, key) || "");
    if(val !== selected) return false;
  }
  return true;
}

/* inject filter buttons in header */
(function injectHeaderFilters(){
  document.querySelectorAll("thead th").forEach((th)=>{
    if(th.classList.contains("no-filter")) return;

    const key = th.dataset.key;
    if(!key || key === "action") return;

    const label = th.textContent.trim();
    th.innerHTML = `
      <div class="th-flex">
        <span>${label}</span>
        <button class="filter-btn" data-filter="${key}" type="button">▼</button>
      </div>
    `;
  });
})();

/* Dropdown UI */
const drop = document.createElement("div");
drop.className = "dropdown";
drop.innerHTML = `
  <div class="drop-head" id="dropTitle">FILTER</div>
  <div class="drop-search"><input id="dropSearch" type="text" placeholder="SEARCH..."></div>
  <div class="drop-list" id="dropList"></div>
  <div class="drop-foot">
    <button class="btn-light" id="btnClear">CLEAR</button>
    <button class="btn-dark" id="btnApply">APPLY</button>
  </div>
`;
document.body.appendChild(drop);

const dropTitle = drop.querySelector("#dropTitle");
const dropSearch = drop.querySelector("#dropSearch");
const dropList = drop.querySelector("#dropList");
const btnClear = drop.querySelector("#btnClear");
const btnApply = drop.querySelector("#btnApply");

let currentKey=null;
let selectedVal="ALL";

function uniqueValues(key){
  let values = cargos.map(r => getColumnValueForFilter(r, key)).filter(v => v !== "");

  if(key === "done"){
    values = ["DONE","NOT DONE"];
  }

  const uniq = Array.from(new Set(values.map(String)));
  uniq.sort((a,b)=>a.localeCompare(b));
  return ["ALL", ...uniq];
}

function renderDropList(list, q){
  const query = (q||"").toLowerCase();
  dropList.innerHTML="";

  list
    .filter(v => String(v).toLowerCase().includes(query))
    .forEach(v=>{
      const div=document.createElement("div");
      div.className="drop-item";
      div.textContent=v;

      if(v===selectedVal){
        div.style.background="#e2e8f0";
        div.style.fontWeight="900";
      }

      div.addEventListener("click", ()=>{
        selectedVal=v;
        renderDropList(list, dropSearch.value);
      });

      dropList.appendChild(div);
    });
}

function openDrop(btn, key){
  currentKey = key;
  selectedVal = filters[key] || "ALL";

  dropTitle.textContent = `FILTER`;
  dropSearch.value="";

  const list = uniqueValues(key);
  renderDropList(list, "");

  const rect = btn.getBoundingClientRect();
  drop.style.left = (rect.left + window.scrollX) + "px";
  drop.style.top  = (rect.bottom + window.scrollY + 6) + "px";
  drop.style.display = "block";

  setTimeout(()=>dropSearch.focus(),0);
}

function closeDrop(){
  drop.style.display="none";
  currentKey=null;
}

document.addEventListener("click",(e)=>{
  const btn = e.target.closest(".filter-btn");
  if(btn){
    e.stopPropagation();
    openDrop(btn, btn.dataset.filter);
    return;
  }
  if(drop.style.display==="block" && !drop.contains(e.target)) closeDrop();
});

dropSearch.addEventListener("input", ()=>{
  if(!currentKey) return;
  renderDropList(uniqueValues(currentKey), dropSearch.value);
});

btnClear.addEventListener("click", ()=>{
  if(!currentKey) return;
  filters[currentKey] = "ALL";
  closeDrop();
  render();
});

btnApply.addEventListener("click", ()=>{
  if(!currentKey) return;
  filters[currentKey] = selectedVal || "ALL";
  closeDrop();
  render();
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDrop();
});

/* ==============================
   RENDER TABLE
================================ */
function render(){
  tbody.innerHTML="";

  cargos
    .filter(matchSearch)
    .filter(matchFilters)
    .forEach(r=>{
      const m = getMasterById(r.masterId) || {};

      const tr=document.createElement("tr");
      if(r.done) tr.classList.add("done");

      tr.innerHTML=`
        <td class="c-bl">${r.bl || ""}</td>
        <td class="c-destination">${r.destination || ""}</td>

        <td>${m.mv || ""}</td>
        <td>${m.etaTs || ""}</td>
        <td class="c-etdTs">${r.etdTs || ""}</td>
        <td class="c-etaDestination">${r.etaDestination || ""}</td>

        <td class="c-connectingVessel">${r.connectingVessel || ""}</td>
        <td class="c-doRelease">${r.doRelease || ""}</td>
        <td class="c-cargoRelease">${r.cargoRelease || ""}</td>

        <td class="c-inland">${r.inland || ""}</td>

        <td>
          <input class="chk" data-id="${r.id}" type="checkbox" ${r.done?"checked":""}>
        </td>

        <td>
          ${
            r.done
            ? `<span class="done-chip">SHIPMENT DONE</span>`
            : `<div class="action">
                <div class="icon-btn del" data-id="${r.id}" title="DELETE">🗑️</div>
              </div>`
          }
        </td>
      `;

      tbody.appendChild(tr);

      // inline edit
      setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", {isBL:true});
      setCellEditable(tr.querySelector(".c-destination"), r.id, "destination");
      setCellEditable(tr.querySelector(".c-etdTs"), r.id, "etdTs", {isDate:true});
      setCellEditable(tr.querySelector(".c-etaDestination"), r.id, "etaDestination", {isDate:true});
      setCellEditable(tr.querySelector(".c-connectingVessel"), r.id, "connectingVessel");
      setCellEditable(tr.querySelector(".c-doRelease"), r.id, "doRelease", {isDate:true});
      setCellEditable(tr.querySelector(".c-cargoRelease"), r.id, "cargoRelease", {isDate:true});
      setCellEditable(tr.querySelector(".c-inland"), r.id, "inland");
    });

  bindEvents();
}

function bindEvents(){
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const id=Number(cb.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;
      row.done=!row.done;
      saveLocal();
      render();
    });
  });

  tbody.querySelectorAll(".del").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=Number(btn.dataset.id);
      if(confirm("DELETE THIS SHIPMENT?")){
        cargos=cargos.filter(x=>x.id!==id);
        saveLocal();
        render();
      }
    });
  });
}

/* ==============================
   IMPORT EXCEL
================================ */
btnImport.addEventListener("click", ()=>{
  if(!activeMasterId){
    alert("PLEASE SAVE MASTER FIRST!");
    return;
  }
  excelFile.click();
});

excelFile.addEventListener("change", async ()=>{
  const file=excelFile.files?.[0];
  if(!file) return;

  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:"array"});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:""});

    let added=0;

    for(const r of rows){
      const bl=normalizeBL(r["BL NO"]||r["NO BL"]||r["BL"]||"");
      const dest=String(r["DESTINATION"]||r["POD"]||"").trim().toUpperCase();
      if(!bl || !dest) continue;

      // prevent duplicate
      if(cargos.some(x=>normalizeBL(x.bl)===bl)) continue;

      cargos.unshift({
        id: Date.now()+Math.floor(Math.random()*9999),
        masterId: activeMasterId,

        bl,
        destination: dest,

        etdTs: parseAndFormatDate(r["ETD TRANSSHIPMENT PORT"]||r["ETD TS PORT"]||r["ETD TS"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||r["ETA PORT OF DESTINATION"]||""),

        connectingVessel: String(r["CONNECTING VESSEL"]||"").trim().toUpperCase(),
        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),

        inland: String(r["INLAND"]||"").trim().toUpperCase(),
        done: false
      });

      added++;
    }

    saveLocal();
    render();

    alert(`IMPORT SUCCESS ✅\nADDED: ${added} ROW(S)`);

  }catch(e){
    console.error(e);
    alert("FAILED TO IMPORT EXCEL. CHECK FORMAT!");
  }finally{
    excelFile.value="";
  }
});

/* ==============================
   INIT
================================ */
searchAll.addEventListener("input", render);
setActiveMasterUI();
render();
