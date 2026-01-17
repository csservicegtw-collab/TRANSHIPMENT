import { upsertToFirestore, deleteFromFirestore, normalizeBL } from "./firebase.-publish.js";

const DATA_KEY="sg_astro_excel_rows_vFINAL";
let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");

/* IMPORT */
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");

/* SEARCH */
const searchAll = document.getElementById("searchAll");

/* ======= SAVE LOCAL ======= */
function saveLocal(){
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}

/* ======= DATE FORMAT (ON BLUR ONLY) ======= */
function parseAndFormatDate(raw){
  if(!raw) return "";
  let v = String(raw).trim();
  if(!v) return "";
  v = v.replace(/[.\-\s]+/g, "/").replace(/\/+/g, "/");
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
    const f=parseAndFormatDate(inp.value);
    if(f && f!==inp.value) inp.value=f;
  });
}

/* inline edit helper */
function setCellEditable(td, rowId, field, opts={}){
  const {isDate=false,isBL=false}=opts;
  td.classList.add("editable");
  td.style.cursor="text";

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const row = cargos.find(x=>x.id===rowId);
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

    const commit = async ()=>{
      let val=input.value.trim();

      if(isBL){
        val = normalizeBL(val);
        if(!val){
          td.innerHTML=row[field] || old;
          return;
        }

        // prevent duplicate
        const dup = cargos.some(x => x.id !== rowId && normalizeBL(x.bl) === val);
        if(dup){
          alert("BL NO ALREADY EXISTS!");
          td.innerHTML=row[field] || old;
          return;
        }

        // if BL changed -> delete old doc on firebase
        const oldBL = normalizeBL(row.bl);
        if(oldBL && oldBL !== val){
          await deleteFromFirestore(oldBL);
        }
      }

      if(isDate) val=parseAndFormatDate(val);

      row[field]=val;
      saveLocal();
      td.innerHTML=val;

      // ✅ update firebase immediately
      try{ await upsertToFirestore(row); }catch(e){ console.warn("firebase update failed",e); }

      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter") commit();
      if(e.key==="Escape") td.innerHTML=old;
    });
  });
}

/* search match */
function matchSearch(row){
  const q=(searchAll.value||"").toLowerCase().trim();
  if(!q) return true;

  // ✅ include done / not done in search
  const doneText = row.done ? "done shipment released" : "not done in transit";

  const merge = [
    row.mv,row.stuffing,row.etdPol,row.etaTs,
    row.bl,row.destination,row.etdTs,row.etaDestination,row.inland,
    row.connectingVessel,row.doRelease,row.cargoRelease,
    doneText
  ].join(" ").toLowerCase();

  return merge.includes(q);
}

/* render */
function render(){
  tbody.innerHTML="";

  cargos.filter(matchSearch).forEach(r=>{
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

      <!-- ✅ ACTION = checkbox + delete -->
      <td class="action-cell">
        <label class="done-wrap">
          <input class="chk" data-id="${r.id}" type="checkbox" ${r.done?"checked":""}>
          <span class="done-text">${r.done ? "SHIPMENT RELEASED" : ""}</span>
        </label>

        <button class="del-btn" data-id="${r.id}" title="DELETE">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);

    // ✅ inline edit all
    setCellEditable(tr.querySelector(".c-mv"), r.id, "mv");
    setCellEditable(tr.querySelector(".c-stuffing"), r.id, "stuffing", {isDate:true});
    setCellEditable(tr.querySelector(".c-etdPol"), r.id, "etdPol", {isDate:true});
    setCellEditable(tr.querySelector(".c-etaTs"), r.id, "etaTs", {isDate:true});

    setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", {isBL:true});
    setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");
    setCellEditable(tr.querySelector(".c-etdTs"), r.id, "etdTs", {isDate:true});
    setCellEditable(tr.querySelector(".c-etaDest"), r.id, "etaDestination", {isDate:true});
    setCellEditable(tr.querySelector(".c-inland"), r.id, "inland");

    setCellEditable(tr.querySelector(".c-connect"), r.id, "connectingVessel");
    setCellEditable(tr.querySelector(".c-dr"), r.id, "doRelease", {isDate:true});
    setCellEditable(tr.querySelector(".c-cr"), r.id, "cargoRelease", {isDate:true});
  });

  bindEvents();
}
render();

/* bind events */
function bindEvents(){
  // ✅ checkbox toggle: can check & uncheck
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", async ()=>{
      const id=Number(cb.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      row.done = cb.checked;   // ✅ FIX: toggle based on checked state
      saveLocal();
      render();

      // publish update firebase
      try{ await upsertToFirestore(row); }catch(e){ console.warn("firebase update failed",e); }
    });
  });

  // delete button always available
  tbody.querySelectorAll(".del-btn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id=Number(btn.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      if(!confirm("DELETE THIS SHIPMENT?")) return;

      cargos = cargos.filter(x=>x.id!==id);
      saveLocal();
      render();

      // ✅ delete from firebase
      try{ await deleteFromFirestore(row.bl); }catch(e){ console.warn("firebase delete failed",e); }
    });
  });
}

/* import excel */
btnImport.addEventListener("click", ()=>{
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
      const mv = String(r["MOTHER VESSEL"]||r["MV"]||"").trim().toUpperCase();
      const stuffing = parseAndFormatDate(r["STUFFING DATE"]||r["STUFFING"]||"");
      const etdPol = parseAndFormatDate(r["ETD POL"]||"");
      const etaTs = parseAndFormatDate(r["ETA TS PORT"]||r["ETA SIN/HKG"]||"");

      const bl=normalizeBL(r["BL NO"]||r["BL"]||"");
      const dest=String(r["DESTINATION"]||r["POD"]||"").trim().toUpperCase();
      if(!bl) continue;

      if(cargos.some(x=>normalizeBL(x.bl)===bl)) continue;

      const row = {
        id: Date.now()+Math.floor(Math.random()*9999),

        mv,
        stuffing,
        etdPol,
        etaTs,

        bl,
        destination: dest,

        etdTs: parseAndFormatDate(r["ETD TS PORT"]||r["ETD TS"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||""),
        inland: String(r["INLAND"]||"-").trim().toUpperCase(),

        connectingVessel: String(r["CONNECTING VESSEL"]||"").trim().toUpperCase(),
        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),

        done:false
      };

      cargos.unshift(row);
      added++;

      // ✅ publish each row to firebase
      try{ await upsertToFirestore(row); }catch(e){ console.warn("firebase publish failed",e); }
    }

    saveLocal();
    render();
    alert(`IMPORT SUCCESS ✅\nADDED: ${added} ROW(S)\nSYNCED TO FIREBASE ✅`);

  }catch(e){
    console.error(e);
    alert("FAILED TO IMPORT EXCEL. CHECK FORMAT!");
  }finally{
    excelFile.value="";
  }
});

searchAll.addEventListener("input", render);
