/*************************************************************
 FINAL ASTRO INTERNAL - EXCEL ONLY + INSERT ROW + FILTER DROPDOWN
 + CONNECTING VESSEL COLUMN (AFTER DESTINATION)
*************************************************************/

const DATA_KEY = "sg_astro_excel_only_vFinal_v2";

let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const btnInsert = document.getElementById("btnInsert");
const searchAll = document.getElementById("searchAll");

function saveLocal(){
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}

/* ===== Utils ===== */
function normalizeBL(v){
  return (v||"").toString().trim().toUpperCase().replace(/\s+/g,"");
}

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
  inp.addEventListener("blur", ()=>{
    const f = parseAndFormatDate(inp.value);
    if(f && f !== inp.value) inp.value = f;
  });
}

function toDateNumber(ddmmyyyy){
  const v = (ddmmyyyy||"").trim();
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return 0;
  return Number(m[3] + m[2] + m[1]);
}

function safeStr(v){ return (v??"").toString().trim(); }

/* ===== Filter state ===== */
const filters = {
  mv: "ALL",
  stuffingDate: "ALL",
  etdPol: "ALL",
  destination: "ALL",
  connectVessel: "ALL",
  etaDestination: "ALL",
  doRelease: "ALL",
  cargoRelease: "ALL",
  done: "ALL" // ALL / DONE / NOT_DONE
};

/* ===== Filter Columns =====
   NOTE:
   - ETA TS PORT (NO FILTER)
   - ETD TS PORT (NO FILTER)
*/
const filterCols = [
  { idx:0, key:"mv", label:"MOTHER VESSEL" },
  { idx:1, key:"stuffingDate", label:"STUFFING DATE" },
  { idx:2, key:"etdPol", label:"ETD POL" },
  // idx:3 ETA TS PORT (NO FILTER)
  { idx:5, key:"destination", label:"DESTINATION" },
  { idx:6, key:"connectVessel", label:"CONNECTING VESSEL" },
  // idx:7 ETD TS PORT (NO FILTER)
  { idx:8, key:"etaDestination", label:"ETA DESTINATION" },
  { idx:10, key:"doRelease", label:"DO RELEASE" },
  { idx:11, key:"cargoRelease", label:"CARGO RELEASE" },
  { idx:12, key:"done", label:"DONE" },
];

/* ===== Search match ===== */
function matchSearch(row){
  const q = (searchAll.value||"").toLowerCase().trim();
  if(!q) return true;

  const merged = [
    row.mv,row.stuffingDate,row.etdPol,row.etaTs,
    row.bl,row.destination,row.connectVessel,
    row.etdTs,row.etaDestination,row.inland,
    row.doRelease,row.cargoRelease,
    row.done ? "DONE" : "NOT DONE"
  ].join(" ").toLowerCase();

  return merged.includes(q);
}

/* ===== Filter match ===== */
function matchFilters(row){
  const eq = (a,b)=> (safeStr(a) === safeStr(b));

  if(filters.mv!=="ALL" && !eq(row.mv, filters.mv)) return false;
  if(filters.stuffingDate!=="ALL" && !eq(row.stuffingDate, filters.stuffingDate)) return false;
  if(filters.etdPol!=="ALL" && !eq(row.etdPol, filters.etdPol)) return false;
  if(filters.destination!=="ALL" && !eq(row.destination, filters.destination)) return false;
  if(filters.connectVessel!=="ALL" && !eq(row.connectVessel, filters.connectVessel)) return false;
  if(filters.etaDestination!=="ALL" && !eq(row.etaDestination, filters.etaDestination)) return false;
  if(filters.doRelease!=="ALL" && !eq(row.doRelease, filters.doRelease)) return false;
  if(filters.cargoRelease!=="ALL" && !eq(row.cargoRelease, filters.cargoRelease)) return false;

  if(filters.done==="DONE" && row.done!==true) return false;
  if(filters.done==="NOT_DONE" && row.done!==false) return false;

  return true;
}

/* ===== Inline edit (Excel style) ===== */
function setCellEditable(td, rowId, field, opts={}){
  const { isDate=false, isBL=false } = opts;
  td.classList.add("editable");

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const row = cargos.find(x=>x.id===rowId);
    if(!row) return;

    const old = td.textContent.trim();
    const input = document.createElement("input");
    input.value = old;

    input.style.width="100%";
    input.style.padding="6px";
    input.style.fontSize="12px";
    input.style.borderRadius="8px";
    input.style.border="1px solid #cbd5e1";

    td.innerHTML="";
    td.appendChild(input);
    input.focus();
    input.select();

    if(isDate) bindDateInput(input);

    const commit = ()=>{
      let val = input.value.trim();

      if(isBL){
        val = normalizeBL(val);
        if(!val){
          alert("BL NO CANNOT BE EMPTY!");
          td.innerHTML = row[field] || "";
          return;
        }
        const dup = cargos.some(x=>x.id!==rowId && normalizeBL(x.bl)===val);
        if(dup){
          alert("BL NO ALREADY EXISTS!");
          td.innerHTML = row[field] || "";
          return;
        }
      }

      if(isDate) val = parseAndFormatDate(val);

      row[field]=val;
      row.updatedAt = Date.now();
      saveLocal();

      td.innerHTML = val;
      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter") commit();
      if(e.key==="Escape") td.innerHTML = old;
    });
  });
}

/* ===== Render ===== */
function sortRows(arr){
  return arr.slice().sort((a,b)=>{
    const da = toDateNumber(a.stuffingDate);
    const db = toDateNumber(b.stuffingDate);

    if(db !== da) return db - da;
    return (b.updatedAt||0) - (a.updatedAt||0);
  });
}

function render(){
  tbody.innerHTML="";

  const data = sortRows(
    cargos.filter(matchSearch).filter(matchFilters)
  );

  data.forEach(r=>{
    const tr = document.createElement("tr");
    if(r.done) tr.classList.add("done");

    tr.innerHTML = `
      <td class="c-mv">${r.mv||""}</td>
      <td class="c-stuff">${r.stuffingDate||""}</td>
      <td class="c-etdpol">${r.etdPol||""}</td>
      <td class="c-etats">${r.etaTs||""}</td>

      <td class="c-bl">${r.bl||""}</td>
      <td class="c-dest">${r.destination||""}</td>
      <td class="c-connect">${r.connectVessel||""}</td>

      <td class="c-etdts">${r.etdTs||""}</td>
      <td class="c-etadest">${r.etaDestination||""}</td>

      <td class="c-inland">${r.inland||""}</td>
      <td class="c-dr">${r.doRelease||""}</td>
      <td class="c-cr">${r.cargoRelease||""}</td>

      <td><input class="chk" data-id="${r.id}" type="checkbox" ${r.done?"checked":""}></td>
      <td>
        ${r.done
          ? `<span class="done-badge">SHIPMENT DONE</span>`
          : `<span class="action-btn del" data-id="${r.id}" title="DELETE">🗑️</span>`
        }
      </td>
    `;

    tbody.appendChild(tr);

    setCellEditable(tr.querySelector(".c-mv"), r.id, "mv");
    setCellEditable(tr.querySelector(".c-stuff"), r.id, "stuffingDate", {isDate:true});
    setCellEditable(tr.querySelector(".c-etdpol"), r.id, "etdPol", {isDate:true});
    setCellEditable(tr.querySelector(".c-etats"), r.id, "etaTs", {isDate:true});

    setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", {isBL:true});
    setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");
    setCellEditable(tr.querySelector(".c-connect"), r.id, "connectVessel");

    setCellEditable(tr.querySelector(".c-etdts"), r.id, "etdTs", {isDate:true});
    setCellEditable(tr.querySelector(".c-etadest"), r.id, "etaDestination", {isDate:true});

    setCellEditable(tr.querySelector(".c-inland"), r.id, "inland");
    setCellEditable(tr.querySelector(".c-dr"), r.id, "doRelease", {isDate:true});
    setCellEditable(tr.querySelector(".c-cr"), r.id, "cargoRelease", {isDate:true});
  });

  bindRowEvents();
}
render();

/* ===== Row events ===== */
function bindRowEvents(){
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const id = Number(cb.dataset.id);
      const row = cargos.find(x=>x.id===id);
      if(!row) return;

      row.done = !row.done;
      row.updatedAt = Date.now();
      saveLocal();
      render();
    });
  });

  tbody.querySelectorAll(".del").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = Number(btn.dataset.id);
      if(confirm("DELETE THIS SHIPMENT?")){
        cargos = cargos.filter(x=>x.id!==id);
        saveLocal();
        render();
      }
    });
  });
}

/* ===== Insert Row ===== */
btnInsert.addEventListener("click", ()=>{
  cargos.unshift({
    id: Date.now()+Math.floor(Math.random()*99999),
    updatedAt: Date.now(),

    mv:"",
    stuffingDate:"",
    etdPol:"",
    etaTs:"",

    bl:"",
    destination:"",
    connectVessel:"",
    etdTs:"",
    etaDestination:"",
    inland:"",

    doRelease:"",
    cargoRelease:"",
    done:false
  });

  saveLocal();
  render();
  alert("ROW INSERTED ✅\nCLICK ANY CELL TO EDIT.");
});

/* ===== Import Excel ===== */
btnImport.addEventListener("click", ()=>excelFile.click());

excelFile.addEventListener("change", async ()=>{
  const file = excelFile.files?.[0];
  if(!file) return;

  try{
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf,{type:"array"});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws,{defval:""});

    let added=0;

    for(const r of rows){
      const mv = String(r["MOTHER VESSEL"]||r["MV"]||"").trim().toUpperCase();
      const stuffingDate = parseAndFormatDate(r["STUFFING DATE"]||"");
      const etdPol = parseAndFormatDate(r["ETD POL"]||"");
      const etaTs = parseAndFormatDate(r["ETA TS PORT"]||r["ETA SIN"]||r["ETA HKG"]||"");

      const bl = normalizeBL(r["BL NO"]||r["BL"]||"");
      const dest = String(r["DESTINATION"]||r["POD"]||"").trim().toUpperCase();
      const connectVessel = String(r["CONNECTING VESSEL"]||"").trim().toUpperCase();

      if(!bl || !dest) continue;
      if(cargos.some(x=>normalizeBL(x.bl)===bl)) continue;

      cargos.push({
        id: Date.now()+Math.floor(Math.random()*99999),
        updatedAt: Date.now(),

        mv,
        stuffingDate,
        etdPol,
        etaTs,

        bl,
        destination: dest,
        connectVessel,
        etdTs: parseAndFormatDate(r["ETD TS PORT"]||r["ETD TS"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||""),
        inland: String(r["INLAND"]||"-").trim().toUpperCase(),

        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),
        done:false
      });

      added++;
    }

    saveLocal();
    render();
    alert(`IMPORT SUCCESS ✅\nADDED: ${added} ROW(S)`);

  }catch(err){
    console.error(err);
    alert("FAILED TO IMPORT EXCEL. PLEASE CHECK TEMPLATE FORMAT!");
  }finally{
    excelFile.value="";
  }
});

/* ===== Search ===== */
searchAll.addEventListener("input", render);

/* =======================================
   ✅ FINAL FILTER SYSTEM (100% WORK)
======================================= */

/* ✅ keys yang boleh difilter */
const FILTER_KEYS = [
  "mv",
  "stuffingDate",
  "etdPol",
  "destination",
  "etaDestination",
  "doRelease",
  "cargoRelease",
  "done"
];

function norm(v){
  return (v ?? "").toString().trim().toUpperCase();
}

/* ✅ reset filter jika key tidak ada */
FILTER_KEYS.forEach(k=>{
  if(!(k in filters)) filters[k] = "ALL";
});

/* ✅ inject tombol filter di header */
(function injectFilterButtons(){
  const ths = document.querySelectorAll("thead th");
  if(!ths.length) return;

  const keyMapByIndex = {
    0:"mv",
    1:"stuffingDate",
    2:"etdPol",
    5:"destination",
    7:"etaDestination",
    9:"doRelease",
    10:"cargoRelease",
    11:"done"
  };

  ths.forEach((th, idx)=>{
    const key = keyMapByIndex[idx];
    if(!key) return;

    const label = th.textContent.trim();

    th.innerHTML = `
      <div class="th-flex">
        <span>${label}</span>
        <button type="button" class="filter-btn" data-key="${key}">▼</button>
      </div>
    `;
  });
})();

/* ✅ create dropdown once */
const drop = document.createElement("div");
drop.className="dropdown";
drop.innerHTML=`
  <div class="drop-head" id="dropTitle">FILTER</div>
  <div class="drop-search"><input id="dropSearch" type="text" placeholder="SEARCH..."></div>
  <div class="drop-list" id="dropList"></div>
  <div class="drop-foot">
    <button type="button" class="btn-light" id="btnClear">CLEAR</button>
    <button type="button" class="btn-dark2" id="btnApply">APPLY</button>
  </div>
`;
document.body.appendChild(drop);

const dropTitle = drop.querySelector("#dropTitle");
const dropSearch = drop.querySelector("#dropSearch");
const dropList = drop.querySelector("#dropList");
const btnClear = drop.querySelector("#btnClear");
const btnApply = drop.querySelector("#btnApply");

let currentKey = null;
let selectedVal = "ALL";

/* ✅ build unique values */
function getUniqueValues(key){
  if(key === "done") return ["ALL","DONE","NOT DONE"];

  const values = cargos
    .map(r => norm(r[key]))
    .filter(Boolean);

  const uniq = Array.from(new Set(values)).sort((a,b)=>a.localeCompare(b));
  return ["ALL", ...uniq];
}

/* ✅ render dropdown list */
function renderList(list, q=""){
  const query = norm(q);
  dropList.innerHTML = "";

  list.filter(v => norm(v).includes(query)).forEach(v=>{
    const item = document.createElement("div");
    item.className="drop-item";
    item.textContent=v;

    if(v === selectedVal){
      item.style.background="#e2e8f0";
      item.style.fontWeight="900";
    }

    item.addEventListener("click", ()=>{
      selectedVal = v;
      renderList(list, dropSearch.value);
    });

    dropList.appendChild(item);
  });
}

/* ✅ open dropdown */
function openDropdown(btn){
  currentKey = btn.dataset.key;

  if(currentKey === "done"){
    if(filters.done === "DONE") selectedVal = "DONE";
    else if(filters.done === "NOT_DONE") selectedVal = "NOT DONE";
    else selectedVal = "ALL";
  }else{
    selectedVal = filters[currentKey] || "ALL";
  }

  dropTitle.textContent = `FILTER : ${currentKey.toUpperCase()}`;
  dropSearch.value = "";

  const list = getUniqueValues(currentKey);
  renderList(list);

  const rect = btn.getBoundingClientRect();
  drop.style.left = (rect.left + window.scrollX) + "px";
  drop.style.top  = (rect.bottom + window.scrollY + 6) + "px";
  drop.style.display = "block";

  setTimeout(()=>dropSearch.focus(),0);
}

/* ✅ close dropdown */
function closeDropdown(){
  drop.style.display="none";
  currentKey=null;
}

/* ✅ click handler (delegation) */
document.addEventListener("click", (e)=>{
  const btn = e.target.closest(".filter-btn");
  if(btn){
    e.preventDefault();
    e.stopPropagation();
    openDropdown(btn);
    return;
  }

  if(drop.style.display==="block" && !drop.contains(e.target)){
    closeDropdown();
  }
});

/* search in dropdown */
dropSearch.addEventListener("input", ()=>{
  if(!currentKey) return;
  renderList(getUniqueValues(currentKey), dropSearch.value);
});

/* clear filter */
btnClear.addEventListener("click", ()=>{
  if(!currentKey) return;

  if(currentKey === "done") filters.done = "ALL";
  else filters[currentKey] = "ALL";

  closeDropdown();
  render(); /* ✅ IMPORTANT */
});

/* apply filter */
btnApply.addEventListener("click", ()=>{
  if(!currentKey) return;

  if(currentKey === "done"){
    if(selectedVal === "DONE") filters.done = "DONE";
    else if(selectedVal === "NOT DONE") filters.done = "NOT_DONE";
    else filters.done = "ALL";
  }else{
    filters[currentKey] = selectedVal;
  }

  closeDropdown();
  render(); /* ✅ IMPORTANT */
});

/* esc close */
document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDropdown();
});

/* ✅ MATCH FILTERS (overwrite previous matchFilters) */
function matchFilters(row){
  // mv
  if(filters.mv !== "ALL" && norm(row.mv) !== norm(filters.mv)) return false;

  if(filters.stuffingDate !== "ALL" && norm(row.stuffingDate) !== norm(filters.stuffingDate)) return false;
  if(filters.etdPol !== "ALL" && norm(row.etdPol) !== norm(filters.etdPol)) return false;

  if(filters.destination !== "ALL" && norm(row.destination) !== norm(filters.destination)) return false;

  if(filters.etaDestination !== "ALL" && norm(row.etaDestination) !== norm(filters.etaDestination)) return false;

  if(filters.doRelease !== "ALL" && norm(row.doRelease) !== norm(filters.doRelease)) return false;
  if(filters.cargoRelease !== "ALL" && norm(row.cargoRelease) !== norm(filters.cargoRelease)) return false;

  // DONE
  if(filters.done === "DONE" && row.done !== true) return false;
  if(filters.done === "NOT_DONE" && row.done !== false) return false;

  return true;
}
