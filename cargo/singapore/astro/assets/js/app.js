const MASTER_KEY="sg_astro_master_vFinal";
const DATA_KEY="sg_astro_data_vFinal";

let master=JSON.parse(localStorage.getItem(MASTER_KEY))||{};
let cargos=JSON.parse(localStorage.getItem(DATA_KEY))||[];

const tbody=document.getElementById("tableBody");
const blForm=document.getElementById("blForm");
const btnSavePublish=document.getElementById("btnSavePublish");
const searchInput=document.getElementById("searchInput");

function saveLocal(){
  localStorage.setItem(MASTER_KEY,JSON.stringify(master));
  localStorage.setItem(DATA_KEY,JSON.stringify(cargos));
}

/* ✅ AUTO DATE FORMAT */
function fmt(v){
  if(!v) return "";
  let p=v.trim().replace(/[-.\s]/g,"/").split("/").filter(Boolean);
  if(p.length<3) return v;

  let d=p[0].padStart(2,"0");
  let m=p[1].padStart(2,"0");
  let y=p[2];
  if(y.length===2) y="20"+y;
  if(y.length!==4) return v;

  return `${d}/${m}/${y}`;
}

/* apply date formatting in input */
document.querySelectorAll("input.date").forEach(inp=>{
  inp.addEventListener("blur", ()=> inp.value = fmt(inp.value));
  inp.addEventListener("keydown", (e)=>{
    if(e.key==="Enter"){
      inp.value = fmt(inp.value);
    }
  });
});

function render(){
  tbody.innerHTML="";

  cargos.forEach(r=>{
    const tr=document.createElement("tr");
    if(r.done) tr.classList.add("done");

    tr.innerHTML=`
      <td>${r.bl}</td>
      <td>${r.destination}</td>
      <td>${master.etaTs || ""}</td>
      <td>${r.etdTs}</td>
      <td>${r.etaPod}</td>
      <td>${master.mv || ""}</td>
      <td>${r.connectVessel}</td>
      <td>${r.dr || ""}</td>
      <td>${r.cr || ""}</td>
      <td><input type="checkbox" ${r.done?"checked":""} data-id="${r.id}" class="chk"></td>
      <td>
        ${r.done
          ? `<span class="done-badge">SHIPMENT DONE</span>`
          : `<span class="action-btn edit" data-id="${r.id}">✏️</span>
             <span class="action-btn del" data-id="${r.id}">🗑️</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  bindRowEvents();
}

function bindRowEvents(){
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

  tbody.querySelectorAll(".edit").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=Number(btn.dataset.id);
      const r=cargos.find(x=>x.id===id);
      if(!r) return;

      r.destination=(prompt("DESTINATION",r.destination)||r.destination).toUpperCase();
      r.etdTs=fmt(prompt("ETD TS",r.etdTs)||r.etdTs);
      r.etaPod=fmt(prompt("ETA POD",r.etaPod)||r.etaPod);
      r.connectVessel=(prompt("CONNECTING VESSEL",r.connectVessel)||r.connectVessel).toUpperCase();
      r.dr=fmt(prompt("DO RELEASE",r.dr)||r.dr||"");
      r.cr=fmt(prompt("CARGO RELEASE",r.cr)||r.cr||"");

      saveLocal();
      render();
    });
  });

  tbody.querySelectorAll(".del").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id=Number(btn.dataset.id);
      if(confirm("DELETE THIS DATA?")){
        cargos=cargos.filter(x=>x.id!==id);
        saveLocal();
        render();
      }
    });
  });
}

/* MASTER SAVE */
document.getElementById("saveMaster").addEventListener("click", ()=>{
  master={
    mv:document.getElementById("mv").value.trim().toUpperCase(),
    etaTs:fmt(document.getElementById("etaTs").value)
  };
  if(!master.mv || !master.etaTs){
    alert("MASTER DATA REQUIRED!");
    return;
  }
  document.getElementById("etaTs").value=master.etaTs;
  saveLocal();
  render();
});

/* ✅ PREVENT DOUBLE CLICK */
let isSaving=false;

blForm.addEventListener("submit",(e)=>{
  e.preventDefault();
  if(isSaving) return;
  isSaving=true;
  btnSavePublish.disabled=true;

  if(!master.mv || !master.etaTs){
    alert("SAVE MASTER DATA FIRST!");
    btnSavePublish.disabled=false;
    isSaving=false;
    return;
  }

  const bl=document.getElementById("bl").value.trim().toUpperCase().replace(/\s+/g,"");
  if(!bl){
    alert("BL REQUIRED");
    btnSavePublish.disabled=false;
    isSaving=false;
    return;
  }

  if(cargos.some(x=>x.bl===bl)){
    alert("BL ALREADY EXISTS (EDIT IN TABLE)");
    btnSavePublish.disabled=false;
    isSaving=false;
    return;
  }

  const row={
    id:Date.now(),
    bl,
    destination:document.getElementById("destination").value.trim().toUpperCase(),
    etdTs:fmt(document.getElementById("etdTs").value),
    etaPod:fmt(document.getElementById("etaPod").value),
    connectVessel:document.getElementById("connectVessel").value.trim().toUpperCase(),
    dr:fmt(document.getElementById("dr").value),
    cr:fmt(document.getElementById("cr").value),
    done:false
  };

  cargos.unshift(row);
  saveLocal();

  requestAnimationFrame(()=>{
    render();
    blForm.reset();
    document.getElementById("bl").focus();
    btnSavePublish.disabled=false;
    isSaving=false;
  });
});

/* ✅ SEARCH BL */
document.getElementById("btnSearch").addEventListener("click", ()=>{
  const q=searchInput.value.trim().toUpperCase().replace(/\s+/g,"");
  if(!q) return alert("INPUT BL TO SEARCH");
  const found=cargos.find(x=>x.bl===q);
  if(!found) return alert("NOT FOUND");
  alert(`FOUND ✅\nBL: ${found.bl}\nDEST: ${found.destination}\nSTATUS: ${found.done?"SHIPMENT DONE":"IN TRANSIT"}`);
});

render();
