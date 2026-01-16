const DATA_KEY="sg_astro_data_excel_v3";
let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const btnInsert = document.getElementById("btnInsert");
const searchAll = document.getElementById("searchAll");

/* =========================
   FILTER STATE
========================= */
const filters = {
  mv: "ALL",
  stuffingDate: "ALL",
  etdPol: "ALL",
  destination: "ALL",
  etaDestination: "ALL",
  doRelease: "ALL",
  cargoRelease: "ALL",
  action: "ALL" // DONE FILTER => ALL / DONE / NOT_DONE
};

function saveLocal(){
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}

function norm(v){
  return (v ?? "").toString().trim().toUpperCase();
}

function normalizeBL(v){
  return (v||"").toString().trim().toUpperCase().replace(/\s+/g,"");
}

/* DATE FORMAT only on blur */
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

  d=d.padStart(2,"0");
  m=m.padStart(2,"0");
  if(y.length===2) y="20"+y;
  if(y.length!==4) return raw;

  return `${d}/${m}/${y}`;
}

function bindDateInput(inp){
  if(!inp) return;
  inp.addEventListener("blur", ()=>{
    const f=parseAndFormatDate(inp.value);
    if(f && f!==inp.value) inp.value=f;
  });
}

/* =========================
   INLINE EDIT
========================= */
function setCellEditable(td, rowId, field, opts={}){
  const {isDate=false, isBL=false} = opts;
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
    input.style.border="1px solid rgba(15,23,42,.25)";
    input.style.borderRadius="8px";

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
      }
      if(isDate) val = parseAndFormatDate(val);

      row[field] = val;
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

/* =========================
   SEARCH + FILTER
========================= */
function matchSearch(row){
  const q = norm(searchAll.value);
  if(!q) return true;

  const merge = [
    row.mv,row.stuffingDate,row.etdPol,row.etaTsPort,
    row.bl,row.destination,row.etdTsPort,row.etaDestination,
    row.inland,row.doRelease,row.cargoRelease,
    row.done ? "DONE" : "NOT DONE"
  ].join(" ");

  return norm(merge).includes(q);
}

function matchFilters(row){
  if(filters.mv !== "ALL" && norm(row.mv) !== norm(filters.mv)) return false;
  if(filters.stuffingDate !== "ALL" && norm(row.stuffingDate) !== norm(filters.stuffingDate)) return false;
  if(filters.etdPol !== "ALL" && norm(row.etdPol) !== norm(filters.etdPol)) return false;
  if(filters.destination !== "ALL" && norm(row.destination) !== norm(filters.destination)) return false;
  if(filters.etaDestination !== "ALL" && norm(row.etaDestination) !== norm(filters.etaDestination)) return false;
  if(filters.doRelease !== "ALL" && norm(row.doRelease) !== norm(filters.doRelease)) return false;
  if(filters.cargoRelease !== "ALL" && norm(row.cargoRelease) !== norm(filters.cargoRelease)) return false;

  if(filters.action === "DONE" && row.done !== true) return false;
  if(filters.action === "NOT_DONE" && row.done !== false) return false;

  return true;
}

/* =========================
   RENDER
========================= */
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
        <td class="c-stuff">${r.stuffingDate||""}</td>
        <td class="c-etdpol">${r.etdPol||""}</td>
        <td class="c-etats">${r.etaTsPort||""}</td>

        <td class="c-bl">${r.bl||""}</td>
        <td class="c-dest">${r.destination||""}</td>

        <td class="c-etdts">${r.etdTsPort||""}</td>
        <td class="c-etadest">${r.etaDestination||""}</td>

        <td class="c-inland">${r.inland||""}</td>
        <td class="c-dr">${r.doRelease||""}</td>
        <td class="c-cr">${r.cargoRelease||""}</td>

        <!-- ✅ ACTION (DONE + DELETE merged) -->
        <td class="action-cell" style="text-align:center;">
          ${r.done
            ? `<span class="done-badge">SHIPMENT DONE</span>`
            : `
              <label style="display:inline-flex;align-items:center;gap:6px;font-weight:900;">
                <input class="chk" data-id="${r.id}" type="checkbox">
                DONE
              </label>
              <span class="action-btn del" data-id="${r.id}" title="DELETE" style="margin-left:10px;">🗑️</span>
            `
          }
        </td>
      `;

      tbody.appendChild(tr);

      /* inline edit */
      setCellEditable(tr.querySelector(".c-mv"), r.id, "mv");
      setCellEditable(tr.querySelector(".c-stuff"), r.id, "stuffingDate", {isDate:true});
      setCellEditable(tr.querySelector(".c-etdpol"), r.id, "etdPol", {isDate:true});
      setCellEditable(tr.querySelector(".c-etats"), r.id, "etaTsPort", {isDate:true});

      setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", {isBL:true});
      setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");

      setCellEditable(tr.querySelector(".c-etdts"), r.id, "etdTsPort", {isDate:true});
      setCellEditable(tr.querySelector(".c-etadest"), r.id, "etaDestination", {isDate:true});

      setCellEditable(tr.querySelector(".c-inland"), r.id, "inland");
      setCellEditable(tr.querySelector(".c-dr"), r.id, "doRelease", {isDate:true});
      setCellEditable(tr.querySelector(".c-cr"), r.id, "cargoRelease", {isDate:true});
    });

  bindRowEvents();
}
render();

/* =========================
   EVENTS
========================= */
function bindRowEvents(){
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const id=Number(cb.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      row.done=true;
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

/* =========================
   INSERT ROW
========================= */
btnInsert.addEventListener("click", ()=>{
  cargos.unshift({
    id: Date.now()+Math.floor(Math.random()*9999),
    mv:"",
    stuffingDate:"",
    etdPol:"",
    etaTsPort:"",
    bl:"",
    destination:"",
    etdTsPort:"",
    etaDestination:"",
    inland:"",
    doRelease:"",
    cargoRelease:"",
    done:false
  });
  saveLocal();
  render();
});

/* =========================
   IMPORT EXCEL
========================= */
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
      const dest = norm(r["DESTINATION"]||r["POD"]||"");
      if(!bl || !dest) continue;
      if(cargos.some(x=>normalizeBL(x.bl)===bl)) continue;

      cargos.unshift({
        id: Date.now()+Math.floor(Math.random()*9999),
        mv: norm(r["MOTHER VESSEL"]||r["MV"]||""),
        stuffingDate: parseAndFormatDate(r["STUFFING DATE"]||""),
        etdPol: parseAndFormatDate(r["ETD POL"]||""),
        etaTsPort: parseAndFormatDate(r["ETA TS PORT"]||r["ETA SIN"]||r["ETA HKG"]||""),

        bl,
        destination: dest,
        etdTsPort: parseAndFormatDate(r["ETD TS PORT"]||r["ETD TS"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||""),

        inland: norm(r["INLAND"]||""),
        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),
        done:false
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

/* SEARCH */
searchAll.addEventListener("input", render);

/* =========================
   FILTER DROPDOWN (NO INDEX)
========================= */
(function injectFilters(){
  document.querySelectorAll("thead th").forEach(th=>{
    const key = th.dataset.key;
    if(!key) return;

    const label = th.textContent.trim();
    th.innerHTML = `
      <div class="th-flex">
        <span>${label}</span>
        <button class="filter-btn" type="button" data-key="${key}">▼</button>
      </div>
    `;
  });
})();

/* dropdown UI */
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

let currentKey=null;
let selectedVal="ALL";

function uniqueValues(key){
  if(key==="action") return ["ALL","DONE","NOT DONE"];

  const values=cargos.map(r=>norm(r[key])).filter(Boolean);
  const uniq=Array.from(new Set(values)).sort((a,b)=>a.localeCompare(b));
  return ["ALL", ...uniq];
}

function renderDrop(list, q=""){
  const query=norm(q);
  dropList.innerHTML="";

  list.filter(v=>norm(v).includes(query)).forEach(v=>{
    const div=document.createElement("div");
    div.className="drop-item";
    div.textContent=v;

    if(v===selectedVal){
      div.style.background="#e2e8f0";
      div.style.fontWeight="900";
    }

    div.addEventListener("click", ()=>{
      selectedVal=v;
      renderDrop(list, dropSearch.value);
    });

    dropList.appendChild(div);
  });
}

function openDrop(btn){
  currentKey=btn.dataset.key;

  if(currentKey==="action"){
    if(filters.action==="DONE") selectedVal="DONE";
    else if(filters.action==="NOT_DONE") selectedVal="NOT DONE";
    else selectedVal="ALL";
  } else {
    selectedVal = filters[currentKey] || "ALL";
  }

  dropTitle.textContent=`FILTER : ${currentKey.toUpperCase()}`;
  dropSearch.value="";

  const list=uniqueValues(currentKey);
  renderDrop(list,"");

  const rect=btn.getBoundingClientRect();
  drop.style.left=(rect.left + window.scrollX)+"px";
  drop.style.top=(rect.bottom + window.scrollY + 6)+"px";
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
    e.preventDefault();
    e.stopPropagation();
    openDrop(btn);
    return;
  }
  if(drop.style.display==="block" && !drop.contains(e.target)) closeDrop();
});

dropSearch.addEventListener("input", ()=>{
  if(!currentKey) return;
  renderDrop(uniqueValues(currentKey), dropSearch.value);
});

btnClear.addEventListener("click", ()=>{
  if(!currentKey) return;
  filters[currentKey]="ALL";
  closeDrop();
  render();
});

btnApply.addEventListener("click", ()=>{
  if(!currentKey) return;

  if(currentKey==="action"){
    if(selectedVal==="DONE") filters.action="DONE";
    else if(selectedVal==="NOT DONE") filters.action="NOT_DONE";
    else filters.action="ALL";
  }else{
    filters[currentKey]=selectedVal;
  }

  closeDrop();
  render();
});
