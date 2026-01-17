import { publishCargoRow, deleteCargoRow, normalizeBL } from "./firebase-publish.js";

const DATA_KEY = "sg_astro_data_excel_final_v4";
let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const searchAll = document.getElementById("searchAll");

/* SAVE */
function saveLocal(){
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}

/* DATE format (blur only) */
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

  if(y.length === 2) y="20"+y;
  if(y.length !== 4) return raw;

  const di = Number(d), mi = Number(m);
  if(di<1 || di>31 || mi<1 || mi>12) return raw;

  return `${d}/${m}/${y}`;
}

function bindDateInput(inp){
  if(!inp) return;
  inp.addEventListener("blur", ()=>{
    const f = parseAndFormatDate(inp.value);
    if(f && f!==inp.value) inp.value=f;
  });
}

/* SEARCH + DONE */
function matchSearch(row){
  const q = (searchAll.value||"").trim().toLowerCase();
  if(!q) return true;

  const doneText = row.done ? "done shipment done selesai" : "not done belum";

  const merge = [
    row.mv,row.stuffingDate,row.etdPol,row.etaTsPort,
    row.bl,row.destination,row.etdTsPort,row.etaDestination,
    row.inland,row.doRelease,row.cargoRelease,doneText
  ].join(" ").toLowerCase();

  return merge.includes(q);
}

/* ===========================
   FILTER EXCEL STYLE
=========================== */
const filters = {}; // {field:Set(values)} if absent => ALL

function getCellValue(row, field){
  if(field === "action") return row.done ? "DONE" : "NOT DONE";
  return String(row[field] ?? "").trim() || "-";
}

function uniqueValues(field){
  const vals = cargos.map(r => getCellValue(r, field));
  const uniq = Array.from(new Set(vals));
  uniq.sort((a,b)=> String(a).localeCompare(String(b)));
  return uniq;
}

function matchFilters(row){
  for(const f in filters){
    const set = filters[f];
    const val = getCellValue(row, f);
    if(!set.has(val)) return false;
  }
  return true;
}

/* dropdown DOM */
const drop = document.createElement("div");
drop.className = "dropdown";
drop.innerHTML = `
  <div class="drop-head"><div id="dropTitle">FILTER</div></div>
  <div class="drop-search"><input id="dropSearch" type="text" placeholder="SEARCH..."></div>
  <div class="drop-tools">
    <label class="drop-checkall">
      <input type="checkbox" id="chkAll">
      <span>SELECT ALL</span>
    </label>
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
const chkAll = drop.querySelector("#chkAll");
const dropList = drop.querySelector("#dropList");
const btnClear = drop.querySelector("#btnClear");
const btnApply = drop.querySelector("#btnApply");

let currentField=null;
let tempSelected=new Set();

function renderDrop(list, q=""){
  const query = q.toLowerCase();
  dropList.innerHTML="";

  const visible = list.filter(v => String(v).toLowerCase().includes(query));

  visible.forEach(v=>{
    const label = document.createElement("label");
    label.className="drop-item";
    label.innerHTML = `
      <input type="checkbox" data-val="${v}" ${tempSelected.has(v)?"checked":""}>
      <span>${v}</span>
    `;
    dropList.appendChild(label);
  });

  // select all status
  const checkedVisible = visible.filter(v=>tempSelected.has(v)).length;
  chkAll.checked = visible.length>0 && checkedVisible===visible.length;
}

function openDrop(btn, field){
  currentField=field;

  // if no filter => all selected
  tempSelected = filters[field]
    ? new Set(filters[field])
    : new Set(uniqueValues(field));

  dropTitle.textContent="FILTER";
  dropSearch.value="";

  const list = uniqueValues(field);
  renderDrop(list,"");

  const rect = btn.getBoundingClientRect();
  drop.style.left = (rect.left + window.scrollX) + "px";
  drop.style.top  = (rect.bottom + window.scrollY + 6) + "px";
  drop.style.display="block";

  setTimeout(()=>dropSearch.focus(),0);
}

function closeDrop(){
  drop.style.display="none";
  currentField=null;
}

dropSearch.addEventListener("input", ()=>{
  if(!currentField) return;
  renderDrop(uniqueValues(currentField), dropSearch.value);
});

dropList.addEventListener("change",(e)=>{
  const cb = e.target.closest("input[type='checkbox']");
  if(!cb) return;
  const val = cb.dataset.val;
  cb.checked ? tempSelected.add(val) : tempSelected.delete(val);
  renderDrop(uniqueValues(currentField), dropSearch.value);
});

chkAll.addEventListener("change", ()=>{
  if(!currentField) return;

  const list = uniqueValues(currentField);
  const q = dropSearch.value.trim().toLowerCase();
  const visible = list.filter(v=>String(v).toLowerCase().includes(q));

  if(chkAll.checked) visible.forEach(v=>tempSelected.add(v));
  else visible.forEach(v=>tempSelected.delete(v));

  renderDrop(list, dropSearch.value);
});

btnApply.addEventListener("click", ()=>{
  if(!currentField) return;

  const all = uniqueValues(currentField);
  if(tempSelected.size === all.length){
    delete filters[currentField]; // means ALL
  }else{
    filters[currentField] = new Set(tempSelected);
  }

  render();
  closeDrop();
});

btnClear.addEventListener("click", ()=>{
  if(!currentField) return;
  delete filters[currentField];
  render();
  closeDrop();
});

/* click outside / open */
document.addEventListener("click",(e)=>{
  const btn = e.target.closest(".filter-btn");
  if(btn){
    e.stopPropagation();
    openDrop(btn, btn.dataset.field);
    return;
  }
  if(drop.style.display==="block" && !drop.contains(e.target)) closeDrop();
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDrop();
});

/* inject header filter buttons */
function injectHeaderFilters(){
  document.querySelectorAll("thead th").forEach(th=>{
    const field = th.dataset.field;
    if(!field) return;
    const label = th.textContent.trim();

    th.innerHTML = `
      <div class="th-flex">
        <span>${label}</span>
        <button class="filter-btn" data-field="${field}" title="FILTER">▼</button>
      </div>
    `;
  });
}

/* INLINE EDIT */
function setCellEditable(td,rowId,field,opts={}){
  const {isDate=false,isBL=false}=opts;
  td.classList.add("editable");

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const row=cargos.find(x=>x.id===rowId);
    if(!row) return;

    const old=td.textContent.trim();
    const input=document.createElement("input");
    input.value=old;

    input.style.width="100%";
    input.style.padding="6px";
    input.style.fontSize="12px";
    input.style.border="1px solid #cbd5e1";
    input.style.borderRadius="6px";

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

        const dup=cargos.some(x=>x.id!==rowId && normalizeBL(x.bl)===val);
        if(dup){ alert("BL NO ALREADY EXISTS!"); td.innerHTML=row.bl; return; }
      }

      if(isDate) val=parseAndFormatDate(val);

      row[field]=val;
      saveLocal();
      td.innerHTML=val;

      publishCargoRow(row);
      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter") commit();
      if(e.key==="Escape") td.innerHTML=old;
    });
  });
}

/* RENDER */
function render(){
  tbody.innerHTML="";

  cargos
    .filter(matchSearch)
    .filter(matchFilters)
    .forEach(r=>{
      const tr=document.createElement("tr");
      if(r.done) tr.classList.add("done");

      tr.innerHTML=`
        <td class="c-mv">${r.mv||""}</td>
        <td class="c-stuffing">${r.stuffingDate||""}</td>
        <td class="c-etdPol">${r.etdPol||""}</td>
        <td class="c-etaTsPort">${r.etaTsPort||""}</td>

        <td class="c-bl">${r.bl||""}</td>
        <td class="c-dest">${r.destination||""}</td>
        <td class="c-etdTsPort">${r.etdTsPort||""}</td>
        <td class="c-etaDest">${r.etaDestination||""}</td>
        <td class="c-inland">${r.inland||""}</td>
        <td class="c-dr">${r.doRelease||""}</td>
        <td class="c-cr">${r.cargoRelease||""}</td>

        <td class="action-cell">
          <div class="action-box">
            <label>
              <input class="chk" data-id="${r.id}" type="checkbox" ${r.done?"checked":""}>
              <span>MARK DONE</span>
            </label>

            ${
              r.done
                ? `<span class="done-badge">SHIPMENT DONE</span>`
                : `<button class="del" data-id="${r.id}" title="DELETE">🗑️</button>`
            }
          </div>
        </td>
      `;

      tbody.appendChild(tr);

      /* inline edit (all editable) */
      setCellEditable(tr.querySelector(".c-mv"), r.id, "mv");
      setCellEditable(tr.querySelector(".c-stuffing"), r.id, "stuffingDate", {isDate:true});
      setCellEditable(tr.querySelector(".c-etdPol"), r.id, "etdPol", {isDate:true});
      setCellEditable(tr.querySelector(".c-etaTsPort"), r.id, "etaTsPort", {isDate:true});

      setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", {isBL:true});
      setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");
      setCellEditable(tr.querySelector(".c-etdTsPort"), r.id, "etdTsPort", {isDate:true});
      setCellEditable(tr.querySelector(".c-etaDest"), r.id, "etaDestination", {isDate:true});
      setCellEditable(tr.querySelector(".c-inland"), r.id, "inland");
      setCellEditable(tr.querySelector(".c-dr"), r.id, "doRelease", {isDate:true});
      setCellEditable(tr.querySelector(".c-cr"), r.id, "cargoRelease", {isDate:true});
    });

  bindEvents();
}

/* events */
function bindEvents(){
  // DONE toggle (can uncheck)
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const id=Number(cb.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      row.done = cb.checked; // ✅ bisa on/off
      saveLocal();
      publishCargoRow(row);
      render();
    });
  });

  // delete
  tbody.querySelectorAll(".del").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=Number(btn.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      if(confirm("DELETE THIS ROW?")){
        cargos=cargos.filter(x=>x.id!==id);
        saveLocal();
        render();
        deleteCargoRow(row.bl); // ✅ hapus doc firebase
      }
    });
  });
}

/* IMPORT */
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
      const bl=normalizeBL(r["BL NO"]||r["BL"]||"");
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

        etdTsPort: parseAndFormatDate(r["ETD TS PORT"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||""),
        inland: String(r["INLAND"]||"").trim().toUpperCase(),

        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),

        done:false
      };

      cargos.unshift(row);
      await publishCargoRow(row); // ✅ write firebase
      added++;
    }

    saveLocal();
    render();
    alert(`IMPORT SUCCESS ✅\nADDED: ${added} ROW(S)`);

  }catch(err){
    console.error(err);
    alert("FAILED TO IMPORT EXCEL. CHECK TEMPLATE FORMAT!");
  }finally{
    excelFile.value="";
  }
});

/* INIT */
document.addEventListener("DOMContentLoaded", ()=>{
  injectHeaderFilters();   // ✅ filter button muncul
  render();
});

searchAll.addEventListener("input", render);
