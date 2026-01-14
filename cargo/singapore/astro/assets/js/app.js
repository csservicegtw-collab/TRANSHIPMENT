const MASTER_KEY="sg_astro_master_excel_v1";
const DATA_KEY="sg_astro_data_excel_v1";

let master = JSON.parse(localStorage.getItem(MASTER_KEY)) || {};
let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");

/* MASTER INPUT */
const mvInp = document.getElementById("mv");
const etdPolInp = document.getElementById("etdPol");
const etaTsInp = document.getElementById("etaTs");
const stuffingDateInp = document.getElementById("stuffingDate");
const btnSaveMaster = document.getElementById("saveMaster");

/* IMPORT */
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");

/* SEARCH */
const searchAll = document.getElementById("searchAll");

function saveLocal(){
  localStorage.setItem(MASTER_KEY, JSON.stringify(master));
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
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

/* Load master UI */
function loadMaster(){
  mvInp.value = master.mv || "";
  etdPolInp.value = master.etdPol || "";
  etaTsInp.value = master.etaTs || "";
  stuffingDateInp.value = master.stuffingDate || "";
}
loadMaster();

/* Save master */
btnSaveMaster.addEventListener("click", ()=>{
  const mv = mvInp.value.trim().toUpperCase();
  const etdPol = parseAndFormatDate(etdPolInp.value);
  const etaTs = parseAndFormatDate(etaTsInp.value);
  const stuffingDate = parseAndFormatDate(stuffingDateInp.value);

  if(!mv || !etdPol || !etaTs || !stuffingDate){
    alert("PLEASE COMPLETE MASTER DATA!");
    return;
  }

  master = { mv, etdPol, etaTs, stuffingDate };
  loadMaster();
  saveLocal();
  render();
});

/* inline edit */
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

    td.innerHTML="";
    td.appendChild(input);
    input.focus();
    input.select();

    if(isDate) bindDateInput(input);

    const commit=()=>{
      let val=input.value.trim();
      if(isBL){
        val=normalizeBL(val);
        if(!val){ td.innerHTML=row.bl; return; }
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

/* search filter */
function matchSearch(row){
  const q=(searchAll.value||"").toLowerCase().trim();
  if(!q) return true;

  const merge = [
    row.bl,row.destination,row.etdTs,row.etaPod,row.connectVessel,row.dr,row.cr,
    master.mv,master.etdPol,master.etaTs,master.stuffingDate
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
      <td class="c-bl">${r.bl}</td>
      <td class="c-dest">${r.destination}</td>
      <td class="c-etdTs">${r.etdTs||""}</td>
      <td class="c-etaPod">${r.etaPod||""}</td>
      <td class="c-connect">${r.connectVessel||""}</td>
      <td class="c-dr">${r.dr||""}</td>
      <td class="c-cr">${r.cr||""}</td>
      <td><input class="chk" data-id="${r.id}" type="checkbox" ${r.done?"checked":""}></td>
      <td>
        ${r.done
          ? `<span class="done-badge">SHIPMENT DONE</span>`
          : `<span class="action-btn del" data-id="${r.id}">🗑️</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);

    setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", {isBL:true});
    setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");
    setCellEditable(tr.querySelector(".c-etdTs"), r.id, "etdTs", {isDate:true});
    setCellEditable(tr.querySelector(".c-etaPod"), r.id, "etaPod", {isDate:true});
    setCellEditable(tr.querySelector(".c-connect"), r.id, "connectVessel");
    setCellEditable(tr.querySelector(".c-dr"), r.id, "dr", {isDate:true});
    setCellEditable(tr.querySelector(".c-cr"), r.id, "cr", {isDate:true});
  });

  bindEvents();
}
render();

/* bind events */
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

/* import excel */
btnImport.addEventListener("click", ()=>{
  if(!master.mv || !master.etdPol || !master.etaTs || !master.stuffingDate){
    alert("PLEASE SAVE MASTER DATA FIRST!");
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
      const bl=normalizeBL(r["BL NO"]||r["BL"]||"");
      const dest=String(r["DESTINATION"]||r["POD"]||"").trim().toUpperCase();
      if(!bl || !dest) continue;

      if(cargos.some(x=>normalizeBL(x.bl)===bl)) continue;

      cargos.unshift({
        id: Date.now()+Math.floor(Math.random()*9999),
        bl,
        destination: dest,
        etdTs: parseAndFormatDate(r["ETD TS"]||r["ETD TS PORT"]||""),
        etaPod: parseAndFormatDate(r["ETA POD"]||r["ETA PORT OF DESTINATION"]||""),
        connectVessel: String(r["CONNECTING VESSEL"]||"").trim().toUpperCase(),
        dr: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cr: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),
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

searchAll.addEventListener("input", render);
