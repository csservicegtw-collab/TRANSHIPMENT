import { publishToFirestore } from "./firebase-publish.js";

/* STORAGE */
const DATA_KEY="sg_astro_data_excel_final_v3";
let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const searchAll = document.getElementById("searchAll");

/* FILTER STATE */
const filters = {}; // key -> value (ALL / selected)

/* SAVE */
function saveLocal(){
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}

function normalizeBL(v){
  return (v||"").toString().trim().toUpperCase().replace(/\s+/g,"");
}

function normStr(v){
  return (v ?? "").toString().trim().toUpperCase();
}

/* DATE FORMAT */
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

/* SEARCH */
function matchSearch(row){
  const q=(searchAll.value||"").toLowerCase().trim();
  if(!q) return true;

  const merge = [
    row.mv,row.stuffingDate,row.etdPol,row.etaTsPort,
    row.blNo,row.destination,row.etdTsPort,row.etaDestination,
    row.inland,row.doRelease,row.cargoRelease,
    row.done ? "DONE" : "NOT DONE"
  ].join(" ").toLowerCase();

  return merge.includes(q);
}

/* FILTER MATCH */
function rowValueForFilter(row, key){
  if(key==="action"){
    return row.done ? "DONE" : "NOT DONE";
  }
  // semua field lain -> uppercase string
  return normStr(row[key]);
}

function matchFilters(row){
  for(const key in filters){
    const selected = filters[key];
    if(!selected || selected==="ALL") continue;

    const rowVal = rowValueForFilter(row, key);
    const selVal = normStr(selected);

    if(rowVal !== selVal) return false;
  }
  return true;
}

/* INLINE EDIT */
function makeEditable(td, rowId, field, isDate=false, isBL=false){
  td.classList.add("editable");

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const row = cargos.find(x=>x.id===rowId);
    if(!row) return;

    // kalau row done => boleh tetap edit? (kamu mau done ga bisa diedit)
    // sesuai sistem lama: DONE = lock edit
    if(row.done) return;

    const old = td.textContent.trim();
    const inp = document.createElement("input");
    inp.value = old;
    inp.style.width="100%";

    td.innerHTML="";
    td.appendChild(inp);
    inp.focus();
    inp.select();

    const commit = async ()=>{
      let v = inp.value.trim();

      if(isBL) v = normalizeBL(v);
      if(isDate) v = parseAndFormatDate(v);

      row[field]=v;
      saveLocal();
      td.innerHTML=v;

      await publishToFirestore(row);
      render();
    };

    inp.addEventListener("blur", commit);
    inp.addEventListener("keydown",(e)=>{
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
    .forEach(row=>{
      const tr=document.createElement("tr");
      if(row.done) tr.classList.add("done-row");

      tr.innerHTML=`
        <td class="mv">${row.mv||""}</td>
        <td class="stuffingDate">${row.stuffingDate||""}</td>
        <td class="etdPol">${row.etdPol||""}</td>
        <td class="etaTsPort">${row.etaTsPort||""}</td>

        <td class="blNo">${row.blNo||""}</td>
        <td class="destination">${row.destination||""}</td>
        <td class="etdTsPort">${row.etdTsPort||""}</td>
        <td class="etaDestination">${row.etaDestination||""}</td>
        <td class="inland">${row.inland||""}</td>
        <td class="doRelease">${row.doRelease||""}</td>
        <td class="cargoRelease">${row.cargoRelease||""}</td>

        <td class="action-cell">
          <div class="action-box">
            <!-- ✅ checkbox ALWAYS available -->
            <input type="checkbox" class="chk" data-id="${row.id}" ${row.done?"checked":""}>

            ${row.done ? `<span class="done-badge">SHIPMENT DONE</span>` : ""}

            ${row.done ? "" : `<span class="trash" data-id="${row.id}" title="DELETE">🗑️</span>`}
          </div>
        </td>
      `;

      tbody.appendChild(tr);

      makeEditable(tr.querySelector(".mv"), row.id, "mv");
      makeEditable(tr.querySelector(".stuffingDate"), row.id, "stuffingDate", true);
      makeEditable(tr.querySelector(".etdPol"), row.id, "etdPol", true);
      makeEditable(tr.querySelector(".etaTsPort"), row.id, "etaTsPort", true);

      makeEditable(tr.querySelector(".blNo"), row.id, "blNo", false, true);
      makeEditable(tr.querySelector(".destination"), row.id, "destination");
      makeEditable(tr.querySelector(".etdTsPort"), row.id, "etdTsPort", true);
      makeEditable(tr.querySelector(".etaDestination"), row.id, "etaDestination", true);
      makeEditable(tr.querySelector(".inland"), row.id, "inland");
      makeEditable(tr.querySelector(".doRelease"), row.id, "doRelease", true);
      makeEditable(tr.querySelector(".cargoRelease"), row.id, "cargoRelease", true);
    });

  bindActionEvents();
}
render();

/* ACTION EVENTS */
function bindActionEvents(){
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", async ()=>{
      const id = Number(cb.dataset.id);
      const row = cargos.find(x=>x.id===id);
      if(!row) return;

      // ✅ toggle DONE true/false
      row.done = cb.checked;

      saveLocal();
      await publishToFirestore(row);
      render();
    });
  });

  tbody.querySelectorAll(".trash").forEach(btn=>{
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

/* IMPORT EXCEL */
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
      const mv = normStr(r["MOTHER VESSEL"]||r["MV"]||"");
      const stuffingDate = parseAndFormatDate(r["STUFFING DATE"]||"");
      const etdPol = parseAndFormatDate(r["ETD POL"]||"");
      const etaTsPort = parseAndFormatDate(r["ETA TS PORT"]||r["ETA SIN"]||r["ETA HKG"]||"");

      const blNo = normalizeBL(r["BL NO"]||r["BL"]||"");
      const destination = normStr(r["DESTINATION"]||r["POD"]||"");

      if(!blNo || !destination) continue;
      if(cargos.some(x=>normalizeBL(x.blNo)===blNo)) continue;

      const row = {
        id: Date.now()+Math.floor(Math.random()*9999),

        mv,
        stuffingDate,
        etdPol,
        etaTsPort,

        blNo,
        destination,
        etdTsPort: parseAndFormatDate(r["ETD TS PORT"]||r["ETD TS"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||""),
        inland: normStr(r["INLAND"]||"-") || "-",
        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),
        done:false
      };

      cargos.unshift(row);
      await publishToFirestore(row);
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

searchAll.addEventListener("input", render);

/* =====================
   FILTER DROPDOWN ✅ FIX
   ===================== */
(function injectFilters(){
  const filterableKeys = [
    "mv","stuffingDate","etdPol","etaTsPort",
    "destination","etaDestination","inland","doRelease","cargoRelease",
    "action"
  ];

  const ths=document.querySelectorAll("thead th");

  ths.forEach(th=>{
    const key = th.dataset.key;
    if(!filterableKeys.includes(key)) return;

    const label = th.textContent.trim();
    th.innerHTML = `
      <div class="th-flex">
        <span>${label}</span>
        <button type="button" class="filter-btn" data-filter="${key}">▼</button>
      </div>
    `;
  });
})();

const drop = document.createElement("div");
drop.className="dropdown";
drop.innerHTML=`
  <div class="head">FILTER</div>
  <div class="search"><input id="dropSearch" placeholder="SEARCH..."></div>
  <div class="list" id="dropList"></div>
  <div class="foot">
    <button class="clear" id="btnClear">CLEAR</button>
    <button class="apply" id="btnApply">APPLY</button>
  </div>
`;
document.body.appendChild(drop);

let currentKey=null;
let selectedVal="ALL";
const dropSearch=drop.querySelector("#dropSearch");
const dropList=drop.querySelector("#dropList");

function uniqueValues(key){
  if(key==="action") return ["ALL","DONE","NOT DONE"];

  const vals = cargos
    .map(r => rowValueForFilter(r, key))
    .filter(v=>String(v).trim()!=="");

  const uniq = [...new Set(vals)].sort((a,b)=>a.localeCompare(b));
  return ["ALL", ...uniq];
}

function renderList(list){
  const q=(dropSearch.value||"").toLowerCase();
  dropList.innerHTML="";

  list
    .filter(v=>String(v).toLowerCase().includes(q))
    .forEach(v=>{
      const div=document.createElement("div");
      div.className="item";
      div.textContent=v;

      if(v===selectedVal){
        div.style.background="#e2e8f0";
        div.style.fontWeight="900";
      }

      div.addEventListener("click", ()=>{
        selectedVal=v;
        renderList(list);
      });

      dropList.appendChild(div);
    });
}

function openDrop(btn, key){
  currentKey=key;
  selectedVal = filters[key] || "ALL";

  const list=uniqueValues(key);
  dropSearch.value="";
  renderList(list);

  const r=btn.getBoundingClientRect();
  drop.style.left=(r.left + window.scrollX) + "px";
  drop.style.top=(r.bottom + window.scrollY + 6) + "px";
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
  renderList(uniqueValues(currentKey));
});

drop.querySelector("#btnClear").addEventListener("click", ()=>{
  if(!currentKey) return;
  filters[currentKey] = "ALL";
  closeDrop();
  render();
});

drop.querySelector("#btnApply").addEventListener("click", ()=>{
  if(!currentKey) return;
  filters[currentKey] = selectedVal;
  closeDrop();
  render();
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDrop();
});
