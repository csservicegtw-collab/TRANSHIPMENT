import { publishRowToFirebase, deleteRowFromFirebase, normalizeBL } from "./firebase-publish.js";

/* ===== CONFIG ===== */
const AGENT = "BENKEL";
const DATA_KEY = `cargo_rows_${AGENT.toLowerCase()}_vFinal`;

/* ===== DATA ===== */
let rows = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const btnAddRow = document.getElementById("btnAddRow");
const searchAll = document.getElementById("searchAll");

/* ===== UTIL ===== */
function saveLocal(){
  localStorage.setItem(DATA_KEY, JSON.stringify(rows));
}
function parseDate(raw){
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
  if(y.length===2) y = "20"+y;
  if(y.length!==4) return raw;

  return `${d}/${m}/${y}`;
}

function searchMatch(r){
  const q = (searchAll.value||"").toLowerCase().trim();
  if(!q) return true;

  const doneText = r.done ? "done shipment released" : "not done in transit";

  const s = [
    r.mv,r.stuffing,r.etdPol,r.etaSin,
    r.bl,r.destination,r.etdSin,r.etaDestination,
    r.inland,r.doRelease,r.cargoRelease,
    doneText
  ].join(" ").toLowerCase();

  return s.includes(q);
}

/* ===== INLINE EDIT ===== */
function editableCell(td, id, field, opt={}){
  const { isDate=false, isBL=false } = opt;

  td.classList.add("editable");

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const row = rows.find(x=>x.id===id);
    if(!row) return;

    const old = td.textContent.trim();
    const input = document.createElement("input");
    input.value = old;

    input.style.width = "100%";
    input.style.padding = "8px 10px";
    input.style.fontSize = "13px";
    input.style.fontWeight = "900";
    input.style.borderRadius = "10px";
    input.style.border = "1px solid rgba(15,23,42,.18)";

    td.innerHTML="";
    td.appendChild(input);
    input.focus();
    input.select();

    const commit = async ()=>{
      let val = input.value.trim();

      if(isBL){
        val = normalizeBL(val);
        if(!val){
          td.innerHTML = row.bl || "";
          return;
        }
        // prevent duplicate
        const dup = rows.some(x=>x.id!==id && normalizeBL(x.bl)===val);
        if(dup){
          alert("BL already exists!");
          td.innerHTML = row.bl || "";
          return;
        }
      }

      if(isDate) val = parseDate(val);

      row[field] = val;
      saveLocal();
      td.innerHTML = val;

      // ✅ sync firebase
      try{ await publishRowToFirebase(row); }catch(e){ console.warn(e); }

      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter") commit();
      if(e.key==="Escape") td.innerHTML = old;
    });
  });
}

/* ===== RENDER ===== */
function render(){
  tbody.innerHTML="";

  rows
    .filter(searchMatch)
    .forEach(r=>{
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="c-mv">${r.mv||""}</td>
        <td class="c-stuff">${r.stuffing||""}</td>
        <td class="c-etdpol">${r.etdPol||""}</td>
        <td class="c-etasin">${r.etaSin||""}</td>

        <td class="c-bl">${r.bl||""}</td>
        <td class="c-dest">${r.destination||""}</td>
        <td class="c-etdsin">${r.etdSin||""}</td>
        <td class="c-etadest">${r.etaDestination||""}</td>
        <td class="c-inland">${r.inland||""}</td>
        <td class="c-dr">${r.doRelease||""}</td>
        <td class="c-cr">${r.cargoRelease||""}</td>

        <td>
          <div class="action-wrap">
            <input class="chk" data-id="${r.id}" type="checkbox" ${r.done?"checked":""}>
            ${
              r.done
                ? `<span class="done-badge">SHIPMENT RELEASED</span>`
                : `<span class="del" data-id="${r.id}" title="DELETE">🗑️</span>`
            }
          </div>
        </td>
      `;

      tbody.appendChild(tr);

      editableCell(tr.querySelector(".c-mv"), r.id, "mv");
      editableCell(tr.querySelector(".c-stuff"), r.id, "stuffing", {isDate:true});
      editableCell(tr.querySelector(".c-etdpol"), r.id, "etdPol", {isDate:true});
      editableCell(tr.querySelector(".c-etasin"), r.id, "etaSin", {isDate:true});

      editableCell(tr.querySelector(".c-bl"), r.id, "bl", {isBL:true});
      editableCell(tr.querySelector(".c-dest"), r.id, "destination");
      editableCell(tr.querySelector(".c-etdsin"), r.id, "etdSin", {isDate:true});
      editableCell(tr.querySelector(".c-etadest"), r.id, "etaDestination", {isDate:true});
      editableCell(tr.querySelector(".c-inland"), r.id, "inland");
      editableCell(tr.querySelector(".c-dr"), r.id, "doRelease", {isDate:true});
      editableCell(tr.querySelector(".c-cr"), r.id, "cargoRelease", {isDate:true});
    });

  bindEvents();
}
render();

/* ===== EVENTS ===== */
function bindEvents(){
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", async ()=>{
      const id = Number(cb.dataset.id);
      const row = rows.find(x=>x.id===id);
      if(!row) return;

      row.done = !row.done;
      saveLocal();
      render();

      try{ await publishRowToFirebase(row); }catch(e){ console.warn(e); }
    });
  });

  tbody.querySelectorAll(".del").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = Number(btn.dataset.id);
      const row = rows.find(x=>x.id===id);
      if(!row) return;

      if(confirm("DELETE THIS SHIPMENT?")){
        rows = rows.filter(x=>x.id!==id);
        saveLocal();
        render();

        try{ await deleteRowFromFirebase(row.bl); }catch(e){ console.warn(e); }
      }
    });
  });
}

/* ===== IMPORT EXCEL ===== */
btnImport.addEventListener("click", ()=> excelFile.click());

excelFile.addEventListener("change", async ()=>{
  const file = excelFile.files?.[0];
  if(!file) return;

  try{
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf,{type:"array"});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws,{defval:""});

    let added = 0;

    for(const r of json){
      const mv = String(r["MV"]||r["MOTHER VESSEL"]||"").trim().toUpperCase();
      const stuffing = parseDate(r["STUFFING"]||r["STUFFING DATE"]||"");
      const etdPol = parseDate(r["ETD POL"]||"");
      const etaSin = parseDate(r["ETA SIN"]||r["ETA TS PORT"]||"");

      const bl = normalizeBL(r["BL"]||r["BL NO"]||"");
      const dest = String(r["DESTINATION"]||r["POD"]||"").trim().toUpperCase();

      const etdSin = parseDate(r["ETD SIN"]||r["ETD TS PORT"]||"");
      const etaDest = parseDate(r["ETA DESTINATION"]||r["ETA POD"]||"");

      const inland = String(r["INLAND"]||"").trim().toUpperCase() || "-";
      const dr = parseDate(r["DO RELEASE"]||r["DR"]||"");
      const cr = parseDate(r["CARGO RELEASE"]||r["CR"]||"");
      const connectingVessel = String(r["CONNECTING VESSEL"]||"").trim().toUpperCase();

      if(!bl || !dest) continue;
      if(rows.some(x=> normalizeBL(x.bl) === bl)) continue;

      const row = {
        id: Date.now() + Math.floor(Math.random()*9999),

        mv, stuffing, etdPol, etaSin,
        bl, destination: dest,
        etdSin, etaDestination: etaDest,
        connectingVessel,
        inland, doRelease: dr, cargoRelease: cr,
        done:false
      };

      rows.unshift(row);
      added++;

      // ✅ publish each row
      try{ await publishRowToFirebase(row); }catch(e){ console.warn(e); }
    }

    saveLocal();
    render();
    alert(`IMPORT SUCCESS ✅\nADDED: ${added} ROW(S)`);
  }catch(e){
    console.error(e);
    alert("FAILED TO IMPORT EXCEL. CHECK TEMPLATE FORMAT!");
  }finally{
    excelFile.value="";
  }
});

/* ===== ADD ROW ===== */
btnAddRow.addEventListener("click", ()=>{
  const row = {
    id: Date.now(),
    mv:"",
    stuffing:"",
    etdPol:"",
    etaSin:"",
    bl:"",
    destination:"",
    etdSin:"",
    etaDestination:"",
    inland:"-",
    doRelease:"",
    cargoRelease:"",
    connectingVessel:"",
    done:false
  };
  rows.unshift(row);
  saveLocal();
  render();
});

/* SEARCH */
searchAll.addEventListener("input", render);
