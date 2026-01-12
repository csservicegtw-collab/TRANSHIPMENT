const MASTER_KEY="sg_astro_master";
const DATA_KEY="sg_astro_data";

let master=JSON.parse(localStorage.getItem(MASTER_KEY))||{};
let data=JSON.parse(localStorage.getItem(DATA_KEY))||[];

const body=document.getElementById("tableBody");

/* DATE FORMAT */
function fmt(v){
  if(!v) return "";
  const p=v.replace(/[-.\s]/g,"/").split("/");
  if(p.length<3) return v;
  return `${p[0].padStart(2,"0")}/${p[1].padStart(2,"0")}/${("20"+p[2]).slice(-4)}`;
}

/* MASTER */
document.getElementById("saveMaster").onclick=()=>{
  master={
    mv:mv.value.trim().toUpperCase(),
    etaTs:fmt(etaTs.value)
  };
  if(!master.mv||!master.etaTs){
    alert("MASTER DATA REQUIRED");
    return;
  }
  localStorage.setItem(MASTER_KEY,JSON.stringify(master));
  render();
};

/* BL INPUT */
blForm.addEventListener("submit",e=>{
  e.preventDefault();
  if(!master.mv){
    alert("SAVE MASTER DATA FIRST");
    return;
  }
  const row={
    id:Date.now(),
    bl:bl.value.toUpperCase(),
    dest:destination.value.toUpperCase(),
    etdTs:fmt(etdTs.value),
    etaPod:fmt(etaPod.value),
    connect:connectVessel.value.toUpperCase(),
    dr:fmt(dr.value),
    cr:fmt(cr.value),
    done:false
  };
  data.unshift(row);
  localStorage.setItem(DATA_KEY,JSON.stringify(data));
  blForm.reset();
  render();
});

/* RENDER */
function render(){
  body.innerHTML="";
  data.forEach(r=>{
    const tr=document.createElement("tr");
    if(r.done) tr.classList.add("done");

    tr.innerHTML=`
      <td>${r.bl}</td>
      <td>${r.dest}</td>
      <td>${master.etaTs||""}</td>
      <td>${r.etdTs}</td>
      <td>${r.etaPod}</td>
      <td>${master.mv||""}</td>
      <td>${r.connect}</td>
      <td>${r.dr}</td>
      <td>${r.cr}</td>
      <td><input type="checkbox" ${r.done?"checked":""} onclick="toggle(${r.id})"></td>
      <td>
        ${r.done
          ? `<span class="done-badge">SHIPMENT DONE</span>`
          : `<span class="action-btn" onclick="editRow(${r.id})">✏️</span>
             <span class="action-btn" onclick="delRow(${r.id})">🗑️</span>`
        }
      </td>`;
    body.appendChild(tr);
  });
}

window.toggle=id=>{
  const r=data.find(x=>x.id===id);
  r.done=!r.done;
  localStorage.setItem(DATA_KEY,JSON.stringify(data));
  render();
};

window.editRow=id=>{
  const r=data.find(x=>x.id===id);
  r.dest=prompt("DESTINATION",r.dest)||r.dest;
  r.etdTs=fmt(prompt("ETD TS",r.etdTs)||r.etdTs);
  r.etaPod=fmt(prompt("ETA POD",r.etaPod)||r.etaPod);
  r.connect=prompt("CONNECTING VESSEL",r.connect)||r.connect;
  r.dr=fmt(prompt("DO RELEASE",r.dr)||r.dr);
  r.cr=fmt(prompt("CARGO RELEASE",r.cr)||r.cr);
  localStorage.setItem(DATA_KEY,JSON.stringify(data));
  render();
};

window.delRow=id=>{
  if(confirm("DELETE THIS DATA?")){
    data=data.filter(x=>x.id!==id);
    localStorage.setItem(DATA_KEY,JSON.stringify(data));
    render();
  }
};

render();
