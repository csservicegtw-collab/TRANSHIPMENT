import { publishToFirestore, normalizeBL } from "./publish-firebase.js";

const STORAGE_KEY = "sg_astro_all_shipments_vFINAL";

let cargos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const searchAll = document.getElementById("searchAll");

function saveLocal(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cargos));
}

function parseAndFormatDate(raw){
  if(!raw) return "";
  let v=String(raw).trim();
  if(!v) return "";
  v=v.replace(/[.\-\s]+/g,"/").replace(/\/+/g,"/");
  const p=v.split("/").filter(Boolean);
  if(p.length<3) return raw;
  let d=p[0].replace(/\D/g,"").padStart(2,"0");
  let m=p[1].replace(/\D/g,"").padStart(2,"0");
  let y=p[2].replace(/\D/g,"");
  if(y.length===2) y="20"+y;
  if(y.length!==4) return raw;
  return `${d}/${m}/${y}`;
}

function dateToSortable(d){
  const x=parseAndFormatDate(d);
  if(!x || x.length<10) return 0;
  const [dd,mm,yy]=x.split("/");
  return Number(`${yy}${mm}${dd}`);
}

function matchSearch(row){
  const q=(searchAll.value||"").toLowerCase().trim();
  if(!q) return true;
  const str=Object.values(row).join(" ").toLowerCase();
  return str.includes(q);
}

// sorting: stuffing newest first (archive)
function sortCargos(){
  cargos.sort((a,b)=>{
    const A = dateToSortable(a.stuffingDate || a.etdPol);
    const B = dateToSortable(b.stuffingDate || b.etdPol);
    return B - A;
  });
}

function render(){
  sortCargos();
  tbody.innerHTML="";

  cargos.filter(matchSearch).forEach(r=>{
    const tr=document.createElement("tr");
    if(r.done) tr.classList.add("done");

    tr.innerHTML=`
      <td class="e mv">${r.motherVessel||""}</td>
      <td class="e stuffingDate">${r.stuffingDate||""}</td>
      <td class="e etdPol">${r.etdPol||""}</td>
      <td class="e etaTsPort">${r.etaTsPort||""}</td>

      <td class="e blNo">${r.blNo||""}</td>
      <td class="e destination">${r.destination||""}</td>
      <td class="e etdTsPort">${r.etdTsPort||""}</td>
      <td class="e etaDestination">${r.etaDestination||""}</td>
      <td class="e inland">${r.inland||""}</td>
      <td class="e doRelease">${r.doRelease||""}</td>
      <td class="e cargoRelease">${r.cargoRelease||""}</td>

      <td><input type="checkbox" class="chk" data-id="${r.id}" ${r.done?"checked":""}></td>
      <td>
        ${r.done ? `<span class="done-badge">SHIPMENT DONE</span>` : `<span class="action-btn del" data-id="${r.id}">🗑️</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });

  bindEvents();
  bindInlineEdit();
}
render();

function bindEvents(){
  tbody.querySelectorAll(".chk").forEach(cb=>{
    cb.addEventListener("change", async ()=>{
      const id=Number(cb.dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;
      row.done = cb.checked;
      saveLocal();
      render();
      try{ await publishToFirestore(row); }catch(e){ console.error(e); }
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

function bindInlineEdit(){
  tbody.querySelectorAll("td.e").forEach(td=>{
    td.addEventListener("click", ()=>{
      if(td.querySelector("input")) return;
      const tr=td.closest("tr");
      const id=Number(tr.querySelector(".chk").dataset.id);
      const row=cargos.find(x=>x.id===id);
      if(!row) return;

      const field=[...td.classList].find(c=>c!=="e");
      const old=td.textContent.trim();

      const inp=document.createElement("input");
      inp.value=old;
      inp.style.width="100%";
      inp.style.padding="5px";
      inp.style.borderRadius="6px";
      inp.style.border="1px solid #cbd5e1";

      td.innerHTML="";
      td.appendChild(inp);
      inp.focus();
      inp.select();

      const commit=async ()=>{
        let val=inp.value.trim().toUpperCase();

        if(field==="blNo"){
          val=normalizeBL(val);
          if(!val){ td.textContent=old; return; }
        }
        if(["stuffingDate","etdPol","etaTsPort","etdTsPort","etaDestination","doRelease","cargoRelease"].includes(field)){
          val=parseAndFormatDate(val);
        }

        row[field]=val;
        saveLocal();
        render();
        try{ await publishToFirestore(row); }catch(e){ console.error(e); }
      };

      inp.addEventListener("blur", commit);
      inp.addEventListener("keydown",(e)=>{
        if(e.key==="Enter") commit();
        if(e.key==="Escape") td.textContent=old;
      });
    });
  });
}

/* IMPORT EXCEL */
btnImport.addEventListener("click", ()=>excelFile.click());

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

      const motherVessel = String(r["MOTHER VESSEL"]||"").trim().toUpperCase();
      const stuffingDate = parseAndFormatDate(r["STUFFING DATE"]||"");
      const etdPol = parseAndFormatDate(r["ETD POL"]||"");
      const etaTsPort = parseAndFormatDate(r["ETA TS PORT"]||r["ETA SIN"]||r["ETA HKG"]||"");

      const blNo = normalizeBL(r["BL NO"]||r["BL"]||"");
      const destination = String(r["DESTINATION"]||r["POD"]||"").trim().toUpperCase();

      if(!motherVessel || !blNo || !destination) continue;

      if(cargos.some(x=>normalizeBL(x.blNo)===blNo)) continue;

      const rowObj={
        id: Date.now()+Math.floor(Math.random()*9999),

        motherVessel,
        stuffingDate,
        etdPol,
        etaTsPort,

        blNo,
        destination,
        etdTsPort: parseAndFormatDate(r["ETD TS PORT"]||""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"]||r["ETA POD"]||""),
        inland: String(r["INLAND"]||"-").trim().toUpperCase() || "-",
        doRelease: parseAndFormatDate(r["DO RELEASE"]||r["DR"]||""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"]||r["CR"]||""),
        done:false
      };

      cargos.push(rowObj);
      added++;

      // publish each row
      publishToFirestore(rowObj).catch(console.error);
    }

    saveLocal();
    render();
    alert(`IMPORT SUCCESS ✅\nADDED: ${added} ROW(S)`);

  }catch(err){
    console.error(err);
    alert("FAILED TO IMPORT EXCEL. CHECK FORMAT!");
  }finally{
    excelFile.value="";
  }
});

searchAll.addEventListener("input", render);
