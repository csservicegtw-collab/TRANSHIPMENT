import {
  listenCargoGateway,
  upsertCargo,
  deleteCargo,
  normalizeBL
} from "./admin-firebase.js";

/* ===============================
   CONFIG PAGE IDENTITY
================================ */
const PAGE_AGENT = "ASTRO";
const PAGE_TSPORT = "SINGAPORE";

/* ===============================
   DOM
================================ */
const tbody = document.getElementById("tableBody");

const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const searchAll = document.getElementById("searchAll");
const btnAddRow = document.getElementById("btnAddRow"); // ✅ must exist in html

/* ===============================
   STATE
================================ */
let cargos = [];      // realtime from Firestore
let viewRows = [];    // after filters/search

/* ===============================
   UTIL DATE FORMAT (blur only)
================================ */
function parseAndFormatDate(raw){
  if(!raw) return "";
  let v = String(raw).trim();
  if(!v) return "";

  v = v.replace(/[.\-\s]+/g, "/").replace(/\/+/g, "/");
  const parts = v.split("/").filter(Boolean);
  if(parts.length < 3) return raw;

  let d=(parts[0]||"").replace(/\D/g,"");
  let m=(parts[1]||"").replace(/\D/g,"");
  let y=(parts[2]||"").replace(/\D/g,"");

  if(!d||!m||!y) return raw;
  d=d.padStart(2,"0");
  m=m.padStart(2,"0");

  if(y.length===2) y="20"+y;
  if(y.length!==4) return raw;

  return `${d}/${m}/${y}`;
}
function bindDateInput(inp){
  inp.addEventListener("blur", ()=>{
    const f = parseAndFormatDate(inp.value);
    if(f && f!==inp.value) inp.value=f;
  });
}

/* ===============================
   FILTER SYSTEM (Excel-like)
================================ */
const filterState = {
  mv: new Set(),
  destination: new Set(),
  etaDestination: new Set(),
  doRelease: new Set(),
  done: new Set(), // "DONE" / "NOT DONE"
};
let activeFilterKey = null;

function getUniqueValues(key){
  const set = new Set();
  for(const r of cargos){
    let val = (r[key] ?? "").toString().trim();
    if(key === "done"){
      val = r.done ? "DONE" : "NOT DONE";
    }
    if(!val) continue;
    set.add(val);
  }
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

function rowPassFilters(r){
  for(const [key, selected] of Object.entries(filterState)){
    if(selected.size === 0) continue;

    let val = (r[key] ?? "").toString().trim();
    if(key === "done") val = r.done ? "DONE" : "NOT DONE";

    if(!selected.has(val)) return false;
  }
  return true;
}

function rowPassSearch(r){
  const q = (searchAll?.value || "").toLowerCase().trim();
  if(!q) return true;

  const doneText = r.done ? "done shipment released" : "not done in transit";

  const merged = [
    r.mv,r.stuffing,r.etdPol,r.etaTs,
    r.bl,r.destination,r.etdTs,r.etaDestination,r.inland,
    r.connectingVessel,r.doRelease,r.cargoRelease,
    doneText,
    r.agent,r.tsPort
  ].join(" ").toLowerCase();

  return merged.includes(q);
}

/* ===== dropdown UI ===== */
const drop = document.createElement("div");
drop.className = "dropdown";
drop.style.display = "none";
drop.innerHTML = `
  <div class="drop-head">
    <span id="dropTitle">FILTER</span>
  </div>
  <div class="drop-search">
    <input id="dropSearch" type="text" placeholder="SEARCH...">
  </div>
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

let tempSelected = new Set();

function renderDropList(list, q=""){
  const query = (q||"").toLowerCase();
  dropList.innerHTML = "";

  list
    .filter(v => v.toLowerCase().includes(query))
    .forEach(v=>{
      const row = document.createElement("div");
      row.className="drop-item";

      row.innerHTML = `
        <label style="display:flex;gap:10px;align-items:center;">
          <input type="checkbox" ${tempSelected.has(v) ? "checked":""}>
          <span>${v}</span>
        </label>
      `;
      const cb = row.querySelector("input");
      cb.addEventListener("change", ()=>{
        if(cb.checked) tempSelected.add(v);
        else tempSelected.delete(v);
      });

      dropList.appendChild(row);
    });
}

function openDrop(btn, key){
  activeFilterKey = key;

  dropTitle.textContent = `FILTER ${key.toUpperCase()}`;
  dropSearch.value="";

  const current = filterState[key] || new Set();
  tempSelected = new Set([...current]);

  const list = key === "done" ? ["DONE","NOT DONE"] : getUniqueValues(key);
  renderDropList(list);

  const rect = btn.getBoundingClientRect();
  drop.style.left = (rect.left + window.scrollX) + "px";
  drop.style.top  = (rect.bottom + window.scrollY + 6) + "px";
  drop.style.display = "block";
  setTimeout(()=>dropSearch.focus(),0);
}

function closeDrop(){
  drop.style.display="none";
  activeFilterKey = null;
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
  if(!activeFilterKey) return;
  const list = activeFilterKey === "done" ? ["DONE","NOT DONE"] : getUniqueValues(activeFilterKey);
  renderDropList(list, dropSearch.value);
});

btnClear.addEventListener("click", ()=>{
  if(!activeFilterKey) return;
  filterState[activeFilterKey] = new Set();
  closeDrop();
  render();
});

btnApply.addEventListener("click", ()=>{
  if(!activeFilterKey) return;
  filterState[activeFilterKey] = new Set([...tempSelected]);
  closeDrop();
  render();
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDrop();
});

/* ===============================
   EXCEL NAVIGATION HELPERS
================================ */
function getEditableCellsInRow(tr){
  if(!tr) return [];
  // ONLY editable cells (exclude action)
  return Array.from(tr.querySelectorAll("td.editable"));
}

function focusCell(tr, idx){
  const cells = getEditableCellsInRow(tr);
  if(idx < 0) idx = 0;
  if(idx >= cells.length) idx = cells.length - 1;
  const td = cells[idx];
  if(td) td.click();
}

function focusNextCell(td){
  const tr = td.closest("tr");
  const cells = getEditableCellsInRow(tr);
  const i = cells.indexOf(td);
  if(i === -1) return;
  const next = cells[i+1];
  if(next) next.click();
}

function focusPrevCell(td){
  const tr = td.closest("tr");
  const cells = getEditableCellsInRow(tr);
  const i = cells.indexOf(td);
  if(i === -1) return;
  const prev = cells[i-1];
  if(prev) prev.click();
}

/* ===============================
   INLINE EDIT (sync to firebase)
   - PATCH: Enter move right
================================ */
function setCellEditable(td, row, field, opts={}){
  const {isDate=false,isBL=false}=opts;

  td.classList.add("editable");
  td.style.cursor="text";

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const old = td.textContent.trim();
    const input = document.createElement("input");
    input.value = old;

    td.classList.add("editing");

    td.innerHTML="";
    td.appendChild(input);
    input.focus();
    input.select();

    if(isDate) bindDateInput(input);

    const commit = async (moveDir=null)=>{
      let val = input.value.trim();

      if(isBL){
        val = normalizeBL(val);
        if(!val){
          td.innerHTML = row.bl || "";
          td.classList.remove("editing");
          return;
        }
      }
      if(isDate) val = parseAndFormatDate(val);

      // BL changed -> move doc
      if(isBL){
        const oldBL = normalizeBL(row.bl);
        if(oldBL !== val){
          await deleteCargo(oldBL);
          row.bl = val;
        }
      }else{
        row[field] = val;
      }

      td.innerHTML = val;
      td.classList.remove("editing");

      // publish update
      await upsertCargo(row);

      // move focus
      if(moveDir === "next") focusNextCell(td);
      if(moveDir === "prev") focusPrevCell(td);
    };

    input.addEventListener("blur", ()=>commit(null));

    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){
        e.preventDefault();
        commit("next"); // ✅ ENTER move right
      }
      if(e.key==="Tab"){
        e.preventDefault();
        if(e.shiftKey) commit("prev");
        else commit("next");
      }
      if(e.key==="Escape"){
        td.innerHTML = old;
        td.classList.remove("editing");
      }
      if(e.key==="ArrowRight"){
        e.preventDefault();
        commit("next");
      }
      if(e.key==="ArrowLeft"){
        e.preventDefault();
        commit("prev");
      }
    });
  });
}

/* ===============================
   RENDER
================================ */
function render(){
  viewRows = cargos.filter(r => rowPassFilters(r) && rowPassSearch(r));

  tbody.innerHTML = "";

  viewRows.forEach(r=>{
    const tr=document.createElement("tr");
    if(r.done) tr.classList.add("done");

    tr.innerHTML=`
      <td class="c-mv">${r.mv||""}</td>
      <td class="c-stuffing">${r.stuffing||""}</td>
      <td class="c-etdPol">${r.etdPol||""}</td>
      <td class="c-etaTs">${r.etaTs||""}</td>

      <td class="c-bl">${r.bl||""}</td>
      <td class="c-dest">${r.destination||""}</td>
      <td class="c-etdTs">${r.etdTs||""}</td>
      <td class="c-etaDest">${r.etaDestination||""}</td>
      <td class="c-inland">${r.inland||""}</td>

      <td class="c-connect">${r.connectingVessel||""}</td>
      <td class="c-dr">${r.doRelease||""}</td>
      <td class="c-cr">${r.cargoRelease||""}</td>

      <td class="action-cell">
        <label class="done-wrap">
          <input class="chk" data-bl="${r.bl}" type="checkbox" ${r.done?"checked":""}>
          <span class="done-text">${r.done ? "SHIPMENT RELEASED" : ""}</span>
        </label>
        <button class="del-btn" data-bl="${r.bl}" title="DELETE">🗑️</button>
      </td>
    `;

    tbody.appendChild(tr);

    // inline edit
    setCellEditable(tr.querySelector(".c-mv"), r, "mv");
    setCellEditable(tr.querySelector(".c-stuffing"), r, "stuffing", {isDate:true});
    setCellEditable(tr.querySelector(".c-etdPol"), r, "etdPol", {isDate:true});
    setCellEditable(tr.querySelector(".c-etaTs"), r, "etaTs", {isDate:true});

    setCellEditable(tr.querySelector(".c-bl"), r, "bl", {isBL:true});
    setCellEditable(tr.querySelector(".c-dest"), r, "destination");
    setCellEditable(tr.querySelector(".c-etdTs"), r, "etdTs", {isDate:true});
    setCellEditable(tr.querySelector(".c-etaDest"), r, "etaDestination", {isDate:true});
    setCellEditable(tr.querySelector(".c-inland"), r, "inland");

    setCellEditable(tr.querySelector(".c-connect"), r, "connectingVessel");
    setCellEditable(tr.querySelector(".c-dr"), r, "doRelease", {isDate:true});
    setCellEditable(tr.querySelector(".c-cr"), r, "cargoRelease", {isDate:true});
  });

  bindRowActions();
}

/* ===============================
   ACTIONS
================================ */
function bindRowActions(){
  // DONE toggle
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", async ()=>{
      const bl = normalizeBL(cb.dataset.bl);
      const row = cargos.find(x=>normalizeBL(x.bl)===bl);
      if(!row) return;

      row.done = cb.checked;
      await upsertCargo(row);
    });
  });

  // delete
  tbody.querySelectorAll(".del-btn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const bl = normalizeBL(btn.dataset.bl);
      const row = cargos.find(x=>normalizeBL(x.bl)===bl);
      if(!row) return;

      if(!confirm("DELETE THIS SHIPMENT?")) return;
      await deleteCargo(bl);
    });
  });
}

/* ===============================
   IMPORT EXCEL
================================ */
btnImport.addEventListener("click", ()=> excelFile.click());

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
      const bl = normalizeBL(r["BL NO"]||r["BL"]||"");
      if(!bl) continue;

      const row = {
        bl,

        agent: PAGE_AGENT,
        tsPort: PAGE_TSPORT,

        mv: String(r["MOTHER VESSEL"]||r["MV"]||"").trim().toUpperCase(),
        stuffing: parseAndFormatDate(r["STUFFING DATE"]||r["STUFFING"]||""),
        etdPol: parseAndFormatDate(r["ETD POL"]||""),
        etaTs: parseAndFormatDate(r["ETA TS PORT"]||r["ETA SIN/HKG"]||""),

        destination: String(r["DESTINATION"]||r["POD"]||"").trim().toUpperCase(),
        etdTs: parseAndFormatDate(r["ETD TS PORT"]||r["ETD TS"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||""),
        inland: String(r["INLAND"]||"-").trim().toUpperCase(),

        connectingVessel: String(r["CONNECTING VESSEL"]||"").trim().toUpperCase(),
        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),

        done:false
      };

      await upsertCargo(row);
      added++;
    }

    alert(`IMPORT SUCCESS ✅\nUPLOADED: ${added} ROW(S)\nREALTIME SYNC ACTIVE ✅`);

  }catch(e){
    console.error(e);
    alert("FAILED TO IMPORT EXCEL. CHECK FORMAT!");
  }finally{
    excelFile.value="";
  }
});

/* ===============================
   ADD ROW (PATCH)
   - langsung bikin row kosong
   - fokus cell pertama
================================ */
btnAddRow?.addEventListener("click", async ()=>{
  const bl = prompt("INPUT BL NO:");
  if(!bl) return;

  const normalized = normalizeBL(bl);

  const row = {
    bl: normalized,
    agent: PAGE_AGENT,
    tsPort: PAGE_TSPORT,

    mv:"",
    stuffing:"",
    etdPol:"",
    etaTs:"",

    destination:"",
    etdTs:"",
    etaDestination:"",
    inland:"",

    connectingVessel:"",
    doRelease:"",
    cargoRelease:"",
    done:false
  };

  await upsertCargo(row);

  // ✅ focus to first cell after realtime reload
  setTimeout(()=>{
    const firstRow = tbody.querySelector("tr");
    if(firstRow) focusCell(firstRow, 0);
  }, 450);
});

/* ===============================
   SEARCH LIVE
================================ */
searchAll.addEventListener("input", render);

/* ===============================
   INJECT HEADER FILTER BUTTONS
================================ */
(function injectHeaderFilters(){
  const ths = document.querySelectorAll("thead th");
  const map = {
    0:"mv",
    5:"destination",
    7:"etaDestination",
    10:"doRelease",
    12:"done"
  };
  ths.forEach((th, idx)=>{
    if(!map[idx]) return;
    const key = map[idx];
    const label = th.textContent.trim();
    th.innerHTML = `
      <div class="th-flex">
        <span>${label}</span>
        <button class="filter-btn" data-filter="${key}" title="FILTER">▼</button>
      </div>
    `;
  });
})();

/* ===============================
   REALTIME SYNC (MODE 1)
================================ */
listenCargoGateway({ agent:PAGE_AGENT, tsPort:PAGE_TSPORT }, (rows)=>{
  cargos = rows;
  render();
});
