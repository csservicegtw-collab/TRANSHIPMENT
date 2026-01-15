import { publishRowToFirestore, deleteRowFromFirestore, normalizeBL as normBL } from "./firebase-publish.js";

const DATA_KEY = "cargo_sg_astro_excel_final_v1";
let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const searchAll = document.getElementById("searchAll");
const btnClearSearch = document.getElementById("btnClearSearch");

/* ===== Helpers ===== */
function saveLocal(){
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}

function normalizeText(v){
  return (v||"").toString().trim().toUpperCase();
}

/* Date parse only on blur / commit */
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

  const di=Number(d), mi=Number(m);
  if(di<1||di>31||mi<1||mi>12) return raw;

  return `${d}/${m}/${y}`;
}

function dateToSortable(v){
  const f=parseAndFormatDate(v);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f);
  if(!m) return 0;
  return Number(`${m[3]}${m[2]}${m[1]}`);
}

/* ===== Search ===== */
function matchSearch(row){
  const q=(searchAll.value||"").toLowerCase().trim();
  if(!q) return true;

  const merge = [
    row.motherVessel,row.stuffingDate,row.etdPol,row.etaTsPort,row.blNo,row.destination,
    row.etdTsPort,row.etaDestination,row.inland,row.doRelease,row.cargoRelease,row.tsPort
  ].join(" ").toLowerCase();

  return merge.includes(q);
}

/* ===== Filters (Header dropdown simple) ===== */
const filters = {
  mv: "ALL",
  destination: "ALL",
  inland: "ALL",
  dr: "ALL",
  cr: "ALL",
  done: "ALL" // ALL / DONE / NOT DONE
};

/* ✅ Header filters injection */
(function injectHeaderFilters(){
  const ths = document.querySelectorAll("thead th");
  // indexes based on your table order
  const map = {
    0:"mv",
    5:"destination",
    8:"inland",
    9:"dr",
    10:"cr",
    11:"done"
  };

  ths.forEach((th, idx)=>{
    if(!map[idx]) return;
    const key = map[idx];
    const label = th.textContent.trim();
    th.innerHTML = `
      <div class="th-flex">
        <span>${label}</span>
        <button class="filter-btn" data-filter="${key}">▼</button>
      </div>
    `;
  });
})();

function uniqueValues(key){
  if(key==="done") return ["ALL","DONE","NOT DONE"];

  const fieldMap = {
    mv: "motherVessel",
    destination: "destination",
    inland: "inland",
    dr: "doRelease",
    cr: "cargoRelease"
  };

  const f = fieldMap[key];
  const values = cargos.map(r => (r[f]??"")).filter(v=>String(v).trim()!=="");
  const uniq = Array.from(new Set(values));
  uniq.sort((a,b)=>String(a).localeCompare(String(b)));
  return ["ALL", ...uniq];
}

function matchFilters(row){
  if(filters.mv!=="ALL" && (row.motherVessel||"")!==filters.mv) return false;
  if(filters.destination!=="ALL" && (row.destination||"")!==filters.destination) return false;
  if(filters.inland!=="ALL" && (row.inland||"")!==filters.inland) return false;
  if(filters.dr!=="ALL" && (row.doRelease||"")!==filters.dr) return false;
  if(filters.cr!=="ALL" && (row.cargoRelease||"")!==filters.cr) return false;

  if(filters.done==="DONE" && row.done!==true) return false;
  if(filters.done==="NOT DONE" && row.done!==false) return false;

  return true;
}

/* ===== Dropdown UI ===== */
const drop = document.createElement("div");
drop.className="dropdown";
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

function renderDropList(list, q=""){
  const query=q.toLowerCase();
  dropList.innerHTML="";
  list.filter(v=>String(v).toLowerCase().includes(query)).forEach(v=>{
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
  currentKey=key;

  if(key==="done"){
    if(filters.done==="DONE") selectedVal="DONE";
    else if(filters.done==="NOT DONE") selectedVal="NOT DONE";
    else selectedVal="ALL";
  } else {
    selectedVal=filters[key] || "ALL";
  }

  dropTitle.textContent="FILTER";
  dropSearch.value="";

  const list=uniqueValues(key);
  renderDropList(list,"");

  const rect=btn.getBoundingClientRect();
  drop.style.left=(rect.left+window.scrollX)+"px";
  drop.style.top=(rect.bottom+window.scrollY+6)+"px";
  drop.style.display="block";
  setTimeout(()=>dropSearch.focus(),0);
}

function closeDrop(){
  drop.style.display="none";
  currentKey=null;
}

document.addEventListener("click",(e)=>{
  const btn=e.target.closest(".filter-btn");
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
  filters[currentKey]="ALL";
  if(currentKey==="done") filters.done="ALL";
  closeDrop();
  render();
});

btnApply.addEventListener("click", ()=>{
  if(!currentKey) return;

  if(currentKey==="done"){
    if(selectedVal==="DONE") filters.done="DONE";
    else if(selectedVal==="NOT DONE") filters.done="NOT DONE";
    else filters.done="ALL";
  } else {
    filters[currentKey]=selectedVal;
  }

  closeDrop();
  render();
});

document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeDrop(); });

/* ===== Inline edit ===== */
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
    input.style.padding="6px";
    input.style.border="1px solid #cbd5e1";
    input.style.borderRadius="8px";
    input.style.fontSize="12px";

    td.innerHTML="";
    td.appendChild(input);
    input.focus();
    input.select();

    const commit = async ()=>{
      let val=input.value.trim();

      if(isBL){
        val=normBL(val);
        if(!val){
          td.innerHTML=row.blNo;
          return;
        }
        // update rule: BL MUST BE UNIQUE -> if exists, prevent
        const dup = cargos.some(x=>x.id!==rowId && normBL(x.blNo)===val);
        if(dup){
          alert("BL ALREADY EXISTS!");
          td.innerHTML=row.blNo;
          return;
        }
      }

      if(isDate) val=parseAndFormatDate(val);
      row[field]=isBL? val : normalizeText(val);

      // ✅ update local + firebase
      saveLocal();
      td.innerHTML=row[field]||"";
      await safePublish(row);

      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter") commit();
      if(e.key==="Escape") td.innerHTML=old;
    });
  });
}

/* ===== Publish Safe ===== */
async function safePublish(row){
  try{
    await publishRowToFirestore(row);
  }catch(e){
    console.error("PUBLISH FAILED", e);
    // do not block UI
  }
}

/* ===== Render ===== */
function render(){
  tbody.innerHTML="";

  const list = cargos
    .filter(matchSearch)
    .filter(matchFilters)
    .sort((a,b)=>{
      // sort by stuffing date desc (newer top)
      const sa=dateToSortable(a.stuffingDate);
      const sb=dateToSortable(b.stuffingDate);
      if(sb!==sa) return sb-sa;
      // fallback by mother vessel
      return String(a.motherVessel||"").localeCompare(String(b.motherVessel||""));
    });

  list.forEach(r=>{
    const tr=document.createElement("tr");
    if(r.done) tr.classList.add("done-row");

    tr.innerHTML=`
      <td class="c-mv">${r.motherVessel||""}</td>
      <td class="c-stuf">${r.stuffingDate||""}</td>
      <td class="c-etdpol">${r.etdPol||""}</td>
      <td class="c-etats">${r.etaTsPort||""}</td>

      <td class="c-bl">${r.blNo||""}</td>
      <td class="c-dest">${r.destination||""}</td>

      <td class="c-etdts">${r.etdTsPort||""}</td>
      <td class="c-etapod">${r.etaDestination||""}</td>
      <td class="c-inland">${r.inland||""}</td>
      <td class="c-dr">${r.doRelease||""}</td>
      <td class="c-cr">${r.cargoRelease||""}</td>

      <td><input type="checkbox" class="checkbox chk" data-id="${r.id}" ${r.done?"checked":""}></td>
      <td>
        ${r.done
          ? `<span class="done-badge">SHIPMENT DONE</span>`
          : `<span class="action-btn del" title="DELETE" data-id="${r.id}">🗑️</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);

    setCellEditable(tr.querySelector(".c-mv"), r.id, "motherVessel");
    setCellEditable(tr.querySelector(".c-stuf"), r.id, "stuffingDate", {isDate:true});
    setCellEditable(tr.querySelector(".c-etdpol"), r.id, "etdPol", {isDate:true});
    setCellEditable(tr.querySelector(".c-etats"), r.id, "etaTsPort", {isDate:true});

    setCellEditable(tr.querySelector(".c-bl"), r.id, "blNo", {isBL:true});
    setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");

    setCellEditable(tr.querySelector(".c-etdts"), r.id, "etdTsPort", {isDate:true});
    setCellEditable(tr.querySelector(".c-etapod"), r.id, "etaDestination", {isDate:true});
    setCellEditable(tr.querySelector(".c-inland"), r.id, "inland");
    setCellEditable(tr.querySelector(".c-dr"), r.id, "doRelease", {isDate:true});
    setCellEditable(tr.querySelector(".c-cr"), r.id, "cargoRelease", {isDate:true});
  });

  bindEvents();
}

/* ===== Row Events ===== */
function bindEvents(){
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", async ()=>{
      const id=Number(cb.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;
      row.done=!row.done;
      saveLocal();
      render();
      await safePublish(row);
    });
  });

  tbody.querySelectorAll(".del").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id=Number(btn.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      if(confirm("DELETE THIS SHIPMENT?")){
        cargos=cargos.filter(x=>x.id!==id);
        saveLocal();
        render();
        try{ await deleteRowFromFirestore(row.blNo); }catch(e){ console.error(e); }
      }
    });
  });
}

/* ===== Import Excel ===== */
btnImport.addEventListener("click", ()=> excelFile.click());

excelFile.addEventListener("change", async ()=>{
  const file=excelFile.files?.[0];
  if(!file) return;

  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:"array"});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:""});

    let added=0;
    let updated=0;

    for(const r of rows){
      const motherVessel = normalizeText(r["MV"] || r["MOTHER VESSEL"] || "");
      const stuffingDate = parseAndFormatDate(r["STUFFING"] || r["STUFFING DATE"] || "");
      const etdPol = parseAndFormatDate(r["ETD POL"] || "");
      const etaTsPort = parseAndFormatDate(r["ETA SIN"] || r["ETA HKG"] || r["ETA TS PORT"] || "");

      const blNo = normBL(r["BL"] || r["BL NO"] || "");
      const destination = normalizeText(r["DESTINATION"] || r["POD"] || "");

      const etdTsPort = parseAndFormatDate(r["ETD TS PORT"] || r["ETD TS"] || "");
      const etaDestination = parseAndFormatDate(r["ETA DESTINATION"] || r["ETA POD"] || "");
      const inland = normalizeText(r["INLAND"] || "-");
      const doRelease = parseAndFormatDate(r["DO RELEASE"] || r["DR"] || "");
      const cargoRelease = parseAndFormatDate(r["CARGO RELEASE"] || r["CR"] || "");

      if(!blNo || !destination) continue;

      // update existing if BL already exists
      const exist = cargos.find(x => normBL(x.blNo) === blNo);

      const payload = {
        id: exist?.id || (Date.now()+Math.floor(Math.random()*99999)),
        agent:"ASTRO",
        tsPort:"SINGAPORE",

        motherVessel,
        stuffingDate,
        etdPol,
        etaTsPort,

        blNo,
        destination,
        etdTsPort,
        etaDestination,
        inland: inland || "-",
        doRelease,
        cargoRelease,
        done: exist?.done ?? false
      };

      if(exist){
        Object.assign(exist, payload);
        updated++;
        await safePublish(exist);
      }else{
        cargos.unshift(payload);
        added++;
        await safePublish(payload);
      }
    }

    saveLocal();
    render();
    alert(`IMPORT SUCCESS ✅\nADDED: ${added}\nUPDATED: ${updated}`);

  }catch(e){
    console.error(e);
    alert("FAILED TO IMPORT EXCEL. CHECK FORMAT!");
  }finally{
    excelFile.value="";
  }
});

/* ===== Search events ===== */
searchAll.addEventListener("input", render);
btnClearSearch.addEventListener("click", ()=>{
  searchAll.value="";
  render();
});

/* init */
render();
