// cargo/app.js
import { publishCargoRow, deleteCargoRow, normalizeBL } from "./firebase-universal.js";
import { listenCargoRealtime } from "./firestore-sync.js";

/**
 * ✅ Universal Config untuk halaman cargo ini
 * Kamu cukup ubah ini per halaman agent/destinasi
 * Contoh:
 * routeKey: "SINGAPORE_ASTRO"
 * agent: "ASTRO"
 * tsPort: "SINGAPORE"
 */
const CARGO_CONTEXT = {
  tsPort: "SINGAPORE",
  agent: "ASTRO",
  routeKey: "SINGAPORE_ASTRO"
};

const DATA_KEY = `cargo_cache_${CARGO_CONTEXT.routeKey}_v1`;

let cargos = []; // 🔥 sumber utama dari Firestore

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const searchAll = document.getElementById("searchAll");

/* =======================
   CACHE (optional)
======================= */
function saveCache(){
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}
function loadCache(){
  try{
    return JSON.parse(localStorage.getItem(DATA_KEY)) || [];
  }catch(e){
    return [];
  }
}

/* =======================
   DATE FORMAT
======================= */
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

/* =======================
   INLINE EDIT
======================= */
function setCellEditable(td, rowId, field, opts={}){
  const { isDate=false, isBL=false } = opts;

  td.classList.add("editable");

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const row = cargos.find(x=>x.id===rowId);
    if(!row) return;

    const old=td.textContent.trim();
    const input=document.createElement("input");
    input.value=old;

    input.style.width="100%";
    input.style.padding="7px 8px";
    input.style.fontSize="12px";
    input.style.border="1px solid rgba(15,23,42,.18)";
    input.style.borderRadius="10px";
    input.style.outline="none";

    td.innerHTML="";
    td.appendChild(input);
    input.focus();
    input.select();

    if(isDate) bindDateInput(input);

    const commit=async ()=>{
      let val=input.value.trim();
      if(isBL){
        val=normalizeBL(val);
        if(!val){ td.innerHTML=row.bl; return; }
      }
      if(isDate) val=parseAndFormatDate(val);

      row[field]=val;
      td.innerHTML=val;

      // publish firestore universal
      try{
        await publishCargoRow(row);
      }catch(e){
        console.warn("firebase publish failed", e);
        alert("Gagal update ke Firestore. Cek koneksi / rules.");
      }

      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter") commit();
      if(e.key==="Escape") td.innerHTML=old;
    });
  });
}

/* =======================
   SEARCH
======================= */
function matchSearch(row){
  const q=(searchAll.value||"").toLowerCase().trim();
  if(!q) return true;

  const doneText = row.done ? "DONE SHIPMENT DONE" : "NOT DONE IN TRANSIT";

  const merge = [
    row.mv,row.stuffingDate,row.etdPol,row.etaTsPort,
    row.bl,row.destination,row.connectingVessel,
    row.etdTsPort,row.etaDestination,
    row.inland,row.doRelease,row.cargoRelease,
    doneText, row.agent, row.tsPort
  ].join(" ").toLowerCase();

  return merge.includes(q);
}

/* =======================
   FILTER
======================= */
const activeFilters = {}; // field => Set(values) OR null

function getCellValue(row, field){
  if(field==="action"){
    return row.done ? "DONE" : "NOT DONE";
  }
  return (row[field] ?? "").toString().trim();
}

function uniqueValues(field){
  const set = new Set();
  cargos.forEach(r=>{
    const v = getCellValue(r, field);
    if(v!=="" ) set.add(v);
  });

  if(field==="action"){
    return ["DONE","NOT DONE"];
  }
  return Array.from(set).sort((a,b)=>a.localeCompare(b));
}

function matchFilters(row){
  for(const field in activeFilters){
    const sel = activeFilters[field];
    if(!sel || sel.size===0) continue;
    const v = getCellValue(row, field) || "";
    if(!sel.has(v)) return false;
  }
  return true;
}

/* =======================
   RENDER
======================= */
function render(){
  tbody.innerHTML="";

  cargos
    .filter(matchSearch)
    .filter(matchFilters)
    .forEach(r=>{
      const tr=document.createElement("tr");

      tr.innerHTML=`
        <td class="c-mv">${r.mv||""}</td>
        <td class="c-stuffing">${r.stuffingDate||""}</td>
        <td class="c-etdPol">${r.etdPol||""}</td>
        <td class="c-etaTsPort">${r.etaTsPort||""}</td>

        <td class="c-bl">${r.bl||""}</td>
        <td class="c-dest">${r.destination||""}</td>

        <td class="c-connect">${r.connectingVessel||""}</td>

        <td class="c-etdTsPort">${r.etdTsPort||""}</td>
        <td class="c-etaDest">${r.etaDestination||""}</td>
        <td class="c-inland">${r.inland||""}</td>
        <td class="c-dr">${r.doRelease||""}</td>
        <td class="c-cr">${r.cargoRelease||""}</td>

        <td class="action-cell">
          <div class="action-wrap">
            ${
              r.done
                ? `<span class="done-badge">SHIPMENT DONE</span>`
                : `<div class="done-box">
                     <input type="checkbox" class="chk" data-id="${r.id}">
                     <span>MARK DONE</span>
                   </div>`
            }
            <div class="del-btn del" data-id="${r.id}" title="DELETE">
              <span>🗑️</span>
            </div>
          </div>
        </td>
      `;

      tbody.appendChild(tr);

      setCellEditable(tr.querySelector(".c-mv"), r.id, "mv");
      setCellEditable(tr.querySelector(".c-stuffing"), r.id, "stuffingDate", {isDate:true});
      setCellEditable(tr.querySelector(".c-etdPol"), r.id, "etdPol", {isDate:true});
      setCellEditable(tr.querySelector(".c-etaTsPort"), r.id, "etaTsPort", {isDate:true});

      setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", {isBL:true});
      setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");
      setCellEditable(tr.querySelector(".c-connect"), r.id, "connectingVessel");

      setCellEditable(tr.querySelector(".c-etdTsPort"), r.id, "etdTsPort", {isDate:true});
      setCellEditable(tr.querySelector(".c-etaDest"), r.id, "etaDestination", {isDate:true});
      setCellEditable(tr.querySelector(".c-inland"), r.id, "inland");
      setCellEditable(tr.querySelector(".c-dr"), r.id, "doRelease", {isDate:true});
      setCellEditable(tr.querySelector(".c-cr"), r.id, "cargoRelease", {isDate:true});
    });

  bindEvents();
}

/* =======================
   EVENTS
======================= */
function bindEvents(){
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", async ()=>{
      const id=Number(cb.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      row.done = !row.done;
      render();

      try{
        await publishCargoRow(row);
      }catch(e){
        console.warn("firebase publish failed", e);
        alert("Gagal update DONE ke Firestore.");
      }
    });
  });

  tbody.querySelectorAll(".del").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id=Number(btn.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      if(confirm("DELETE THIS SHIPMENT?")){
        cargos = cargos.filter(x=>x.id!==id);
        render();

        try{
          await deleteCargoRow(row.bl);
        }catch(e){
          console.warn("firebase delete failed", e);
          alert("Gagal delete di Firestore.");
        }
      }
    });
  });
}

/* =======================
   IMPORT EXCEL
======================= */
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

    for(const r of rows){
      const bl = normalizeBL(r["BL NO"]||r["BL"]||"");
      if(!bl) continue;

      if(cargos.some(x=>normalizeBL(x.bl)===bl)) continue;

      const row={
        id: Date.now()+Math.floor(Math.random()*99999),

        mv: String(r["MV"]||r["MOTHER VESSEL"]||"").trim().toUpperCase(),
        stuffingDate: parseAndFormatDate(r["STUFFING DATE"]||""),
        etdPol: parseAndFormatDate(r["ETD POL"]||""),
        etaTsPort: parseAndFormatDate(r["ETA TS PORT"]||r["ETA SIN/HKG"]||""),

        bl,
        destination: String(r["DESTINATION"]||r["POD"]||"").trim().toUpperCase(),
        connectingVessel: String(r["CONNECTING VESSEL"]||r["CV"]||"").trim().toUpperCase(),

        etdTsPort: parseAndFormatDate(r["ETD TS PORT"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||""),
        inland: String(r["INLAND"]||"").trim().toUpperCase(),

        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),

        done:false,

        // ✅ universal keys
        agent: CARGO_CONTEXT.agent,
        tsPort: CARGO_CONTEXT.tsPort,
        routeKey: CARGO_CONTEXT.routeKey
      };

      cargos.unshift(row);

      try{
        await publishCargoRow(row);
      }catch(e){
        console.warn("firebase publish failed", e);
      }

      added++;
    }

    render();
    alert(`IMPORT SUCCESS ✅\nADDED: ${added} ROW(S)`);

  }catch(e){
    console.error(e);
    alert("FAILED TO IMPORT EXCEL. CHECK FORMAT!");
  }finally{
    excelFile.value="";
  }
});

/* =======================
   SEARCH
======================= */
searchAll.addEventListener("input", render);

/* =======================
   FILTER UI
======================= */
(function injectHeaderFilters(){
  const ths = document.querySelectorAll("thead th[data-field]");
  ths.forEach(th=>{
    const field = th.dataset.field;
    if(!field) return;

    th.innerHTML = `
      <div class="th-flex">
        <span>${th.textContent.trim()}</span>
        <button class="filter-btn" data-filter="${field}">▼</button>
      </div>
    `;
  });
})();

const drop = document.createElement("div");
drop.className="dropdown";
drop.innerHTML=`
  <div class="drop-head" id="dropTitle">FILTER</div>
  <div class="drop-search"><input id="dropSearch" type="text" placeholder="SEARCH..."></div>
  <div class="drop-list" id="dropList"></div>
  <div class="drop-foot">
    <button class="btn-light" id="btnClear">CLEAR</button>
    <button class="btn-dark" id="btnApply">APPLY</button>
  </div>
`;
document.body.appendChild(drop);

const dropTitle=drop.querySelector("#dropTitle");
const dropSearch=drop.querySelector("#dropSearch");
const dropList=drop.querySelector("#dropList");
const btnClear=drop.querySelector("#btnClear");
const btnApply=drop.querySelector("#btnApply");

let currentField=null;
let tempSelected=new Set();

function renderDropList(field, q=""){
  const query=(q||"").toLowerCase();
  const values=uniqueValues(field);

  dropList.innerHTML="";

  values
    .filter(v=>v.toLowerCase().includes(query))
    .forEach(v=>{
      const div=document.createElement("div");
      div.className="drop-item";

      const cb=document.createElement("input");
      cb.type="checkbox";
      cb.checked=tempSelected.has(v);

      cb.addEventListener("change", ()=>{
        if(cb.checked) tempSelected.add(v);
        else tempSelected.delete(v);
      });

      const label=document.createElement("span");
      label.textContent=v;

      div.appendChild(cb);
      div.appendChild(label);
      dropList.appendChild(div);
    });
}

function openDrop(btn, field){
  currentField=field;
  dropTitle.textContent="FILTER";
  dropSearch.value="";

  tempSelected = new Set(activeFilters[field] ? Array.from(activeFilters[field]) : uniqueValues(field));

  renderDropList(field,"");

  const rect=btn.getBoundingClientRect();
  drop.style.left=(rect.left + window.scrollX) + "px";
  drop.style.top=(rect.bottom + window.scrollY + 6) + "px";
  drop.style.display="block";

  setTimeout(()=>dropSearch.focus(),0);
}

function closeDrop(){
  drop.style.display="none";
  currentField=null;
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
  if(!currentField) return;
  renderDropList(currentField, dropSearch.value);
});

btnClear.addEventListener("click", ()=>{
  if(!currentField) return;
  delete activeFilters[currentField];
  closeDrop();
  render();
});

btnApply.addEventListener("click", ()=>{
  if(!currentField) return;

  if(tempSelected.size===0){
    delete activeFilters[currentField];
  }else{
    activeFilters[currentField] = new Set(tempSelected);
  }

  closeDrop();
  render();
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDrop();
});

/* =======================
   🔥 REALTIME SYNC (ALL ADMIN)
======================= */
(function initRealtime(){
  // tampilkan cache dulu agar tidak blank
  const cached = loadCache();
  if(cached.length){
    cargos = cached;
    render();
  }

  // realtime firestore universal
  listenCargoRealtime((rows)=>{
    cargos = rows
      .filter(r => (r.routeKey||"") === CARGO_CONTEXT.routeKey)
      .map((r, idx)=>({
        id: idx + 1,
        mv: r.mv || "",
        stuffingDate: r.stuffingDate || "",
        etdPol: r.etdPol || "",
        etaTsPort: r.etaTsPort || "",
        bl: r.blNo || "",
        destination: r.destination || "",
        connectingVessel: r.connectingVessel || "",
        etdTsPort: r.etdTsPort || "",
        etaDestination: r.etaDestination || "",
        inland: r.inland || "",
        doRelease: r.doRelease || "",
        cargoRelease: r.cargoRelease || "",
        done: !!r.done,
        agent: r.agent || "",
        tsPort: r.tsPort || "",
        routeKey: r.routeKey || ""
      }));

    saveCache();
    render();
  }, { routeKey: CARGO_CONTEXT.routeKey });
})();
