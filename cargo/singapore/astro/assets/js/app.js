const MASTER_KEY="sg_astro_master_vFinal";
const DATA_KEY="sg_astro_data_vFinal";

let master=JSON.parse(localStorage.getItem(MASTER_KEY))||{};
let cargos=JSON.parse(localStorage.getItem(DATA_KEY))||[];

const tbody=document.getElementById("tableBody");
const blForm=document.getElementById("blForm");
const btnSavePublish=document.getElementById("btnSavePublish");
const searchInput=document.getElementById("searchInput");

/* ===== FILTER STATE ===== */
const filters = {
  etaTs: "ALL",
  etdTs: "ALL",
  etaPod: "ALL",
  mv: "ALL",
  connectVessel: "ALL",
  dr: "ALL",
  cr: "ALL"
};

/* ============================================================
   ✅ DATE PARSER (accept: slash / dash - dot . space)
   input: 6/6/26, 6-6-26, 6 6 26, 6.6.26, 06/06/2026
   output: 06/06/2026
   ============================================================ */
function parseAndFormatDate(raw){
  if(!raw) return "";
  let v = String(raw).trim();
  if(!v) return "";

  // unify separators
  v = v.replace(/[.\-\s]+/g, "/");  // dot/dash/space -> slash
  v = v.replace(/\/+/g, "/");

  const parts = v.split("/").filter(Boolean);
  if(parts.length < 3) return raw; // not complete yet

  let d = (parts[0] || "").replace(/\D/g,"");
  let m = (parts[1] || "").replace(/\D/g,"");
  let y = (parts[2] || "").replace(/\D/g,"");

  if(!d || !m || !y) return raw;

  d = d.padStart(2,"0");
  m = m.padStart(2,"0");

  // year handling
  if(y.length === 2) y = "20" + y;
  if(y.length === 1) y = "200" + y;
  if(y.length !== 4) return raw;

  // clamp basic ranges (prevent weird output)
  const di = Number(d), mi = Number(m);
  if(di < 1 || di > 31 || mi < 1 || mi > 12) return raw;

  return `${d}/${m}/${y}`;
}

/* ✅ checks date completeness even if typed space/dash */
function isDateComplete(raw){
  if(!raw) return false;
  const v = String(raw).trim();
  // if contains at least 2 separators OR three groups of digits
  const sepCount = (v.match(/[\/\-\.\s]/g) || []).length;
  if(sepCount >= 2) return true;

  // fallback: digits groups (e.g. 60626 not supported)
  return false;
}

/* ===== debounce ===== */
function debounce(fn, delay=250){
  let t=null;
  return (...args)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...args), delay);
  };
}

/* ✅ bind date inputs: format while typing + on blur + enter */
function bindDateInput(inp){
  if(!inp) return;

  const doFormat = ()=>{
    const formatted = parseAndFormatDate(inp.value);
    // only replace if changed and valid
    if(formatted && formatted !== inp.value) inp.value = formatted;
  };

  // blur always format
  inp.addEventListener("blur", doFormat);

  // Enter format
  inp.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){
      doFormat();
    }
  });

  // typing (debounced)
  const debounced = debounce(()=>{
    if(isDateComplete(inp.value)) doFormat();
  }, 220);

  inp.addEventListener("input", debounced);
}

/* ✅ bind ALL date fields (master + detail) */
document.querySelectorAll("input.date").forEach(bindDateInput);

function saveLocal(){
  localStorage.setItem(MASTER_KEY,JSON.stringify(master));
  localStorage.setItem(DATA_KEY,JSON.stringify(cargos));
}

function normalizeBL(v){
  return (v||"").trim().toUpperCase().replace(/\s+/g,"");
}

/* ===== MASTER SAVE ===== */
document.getElementById("saveMaster").addEventListener("click", ()=>{
  const mvVal = document.getElementById("mv").value.trim().toUpperCase();
  const etaVal = parseAndFormatDate(document.getElementById("etaTs").value);

  master={ mv: mvVal, etaTs: etaVal };

  if(!master.mv || !master.etaTs){
    alert("MASTER DATA REQUIRED!");
    return;
  }

  document.getElementById("etaTs").value = master.etaTs;
  saveLocal();
  render();
});

/* ===== FILTER MATCH ===== */
function matchFilters(row){
  const rowEtaTs = master.etaTs || "";
  const rowMv = master.mv || "";

  if(filters.etaTs !== "ALL" && rowEtaTs !== filters.etaTs) return false;
  if(filters.mv !== "ALL" && rowMv !== filters.mv) return false;

  if(filters.etdTs !== "ALL" && (row.etdTs||"") !== filters.etdTs) return false;
  if(filters.etaPod !== "ALL" && (row.etaPod||"") !== filters.etaPod) return false;
  if(filters.connectVessel !== "ALL" && (row.connectVessel||"") !== filters.connectVessel) return false;
  if(filters.dr !== "ALL" && (row.dr||"") !== filters.dr) return false;
  if(filters.cr !== "ALL" && (row.cr||"") !== filters.cr) return false;

  return true;
}

/* ===== RENDER ===== */
function render(){
  tbody.innerHTML="";

  cargos
    .filter(matchFilters)
    .forEach(r=>{
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
render();

/* ===== ROW EVENTS ===== */
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

      r.destination=(prompt("DESTINATION",r.destination)||r.destination).trim().toUpperCase();
      r.etdTs=parseAndFormatDate(prompt("ETD TRANSSHIPMENT PORT",r.etdTs)||r.etdTs);
      r.etaPod=parseAndFormatDate(prompt("ETA PORT OF DISCHARGE",r.etaPod)||r.etaPod);
      r.connectVessel=(prompt("CONNECTING VESSEL",r.connectVessel)||r.connectVessel).trim().toUpperCase();
      r.dr=parseAndFormatDate(prompt("DO RELEASE",r.dr||"")||r.dr||"");
      r.cr=parseAndFormatDate(prompt("CARGO RELEASE",r.cr||"")||r.cr||"");

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

/* ===== PREVENT DOUBLE SUBMIT ===== */
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

  const bl = normalizeBL(document.getElementById("bl").value);
  if(!bl){
    alert("BL REQUIRED");
    btnSavePublish.disabled=false;
    isSaving=false;
    return;
  }

  if(cargos.some(x=>normalizeBL(x.bl)===bl)){
    alert("BL ALREADY EXISTS (EDIT IN TABLE)");
    btnSavePublish.disabled=false;
    isSaving=false;
    return;
  }

  // ✅ Ensure all date fields formatted BEFORE save
  const etdTsVal = parseAndFormatDate(document.getElementById("etdTs").value);
  const etaPodVal = parseAndFormatDate(document.getElementById("etaPod").value);
  const drVal = parseAndFormatDate(document.getElementById("dr").value);
  const crVal = parseAndFormatDate(document.getElementById("cr").value);

  // put formatted values back into input (so user sees it even before submit)
  document.getElementById("etdTs").value = etdTsVal;
  document.getElementById("etaPod").value = etaPodVal;
  document.getElementById("dr").value = drVal;
  document.getElementById("cr").value = crVal;

  const row={
    id:Date.now(),
    bl,
    destination:document.getElementById("destination").value.trim().toUpperCase(),
    etdTs:etdTsVal,
    etaPod:etaPodVal,
    connectVessel:document.getElementById("connectVessel").value.trim().toUpperCase(),
    dr:drVal,
    cr:crVal,
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

/* ===== SEARCH BL ===== */
document.getElementById("btnSearch").addEventListener("click", ()=>{
  const q = normalizeBL(searchInput.value);
  if(!q) return alert("INPUT BL TO SEARCH");

  const found=cargos.find(x=>normalizeBL(x.bl)===q);
  if(!found) return alert("NOT FOUND");

  alert(`FOUND ✅\nBL: ${found.bl}\nDESTINATION: ${found.destination}\nSTATUS: ${found.done?"SHIPMENT DONE":"IN TRANSIT"}`);
});

/* ===========================
   EXCEL STYLE FILTER DROPDOWN
   =========================== */

(function injectHeaderFilters(){
  const ths = document.querySelectorAll("thead th");
  const map = {
    2:"etaTs",
    3:"etdTs",
    4:"etaPod",
    5:"mv",
    6:"connectVessel",
    7:"dr",
    8:"cr"
  };

  ths.forEach((th, idx)=>{
    if(!map[idx]) return;
    const key = map[idx];
    const label = th.textContent.trim();

    th.innerHTML = `
      <div class="th-flex">
        ${label}
        <button class="filter-btn" data-filter="${key}">▼</button>
      </div>
    `;
  });
})();

const drop = document.createElement("div");
drop.className = "dropdown";
drop.innerHTML = `
  <div class="drop-head" id="dropTitle">FILTER</div>
  <div class="drop-search"><input id="dropSearch" type="text" placeholder="SEARCH..."></div>
  <div class="drop-list" id="dropList"></div>
  <div class="drop-foot">
    <button class="btn-light" id="btnClear">CLEAR</button>
    <button class="btn-dark" id="btnApply">APPLY</button>
  </div>
`;
document.body.appendChild(drop);

const dropTitle = drop.querySelector("#dropTitle");
const dropSearch = drop.querySelector("#dropSearch");
const dropList = drop.querySelector("#dropList");
const btnClear = drop.querySelector("#btnClear");
const btnApply = drop.querySelector("#btnApply");

let currentKey = null;
let selectedVal = "ALL";

function uniqueValues(key){
  let values = [];
  if(key === "etaTs") values = master.etaTs ? [master.etaTs] : [];
  else if(key === "mv") values = master.mv ? [master.mv] : [];
  else values = cargos.map(r => (r[key] ?? "")).filter(v=>v!=="");

  const uniq = Array.from(new Set(values));
  uniq.sort((a,b)=> String(a).localeCompare(String(b)));
  return ["ALL", ...uniq];
}

function renderDropList(list, q){
  const query = (q||"").toLowerCase();
  dropList.innerHTML="";

  list.filter(v=> String(v).toLowerCase().includes(query))
      .forEach(v=>{
        const div=document.createElement("div");
        div.className="drop-item";
        div.textContent=v;

        if(v===selectedVal){
          div.style.background="#e2e8f0";
          div.style.fontWeight="900";
        }

        div.addEventListener("click", ()=>{
          selectedVal=v;
          renderDropList(list, dropSearch.value);
        });

        dropList.appendChild(div);
      });
}

function openDrop(btn, key){
  currentKey = key;
  selectedVal = filters[key] || "ALL";

  dropTitle.textContent = `FILTER`;
  dropSearch.value="";

  const list = uniqueValues(key);
  renderDropList(list, "");

  const rect = btn.getBoundingClientRect();
  const left = rect.left + window.scrollX;
  const top  = rect.bottom + window.scrollY + 6;

  drop.style.left = left + "px";
  drop.style.top  = top + "px";
  drop.style.display = "block";
  setTimeout(()=>dropSearch.focus(),0);
}

function closeDrop(){
  drop.style.display="none";
  currentKey=null;
}

document.addEventListener("click",(e)=>{
  const btn = e.target.closest(".filter-btn");
  if(btn){
    e.stopPropagation();
    openDrop(btn, btn.dataset.filter);
    return;
  }
  if(drop.style.display==="block" && !drop.contains(e.target)) closeDrop();
});

dropSearch.addEventListener("input", ()=>{
  if(!currentKey) return;
  renderDropList(uniqueValues(currentKey), dropSearch.value);
});

btnClear.addEventListener("click", ()=>{
  if(currentKey) filters[currentKey] = "ALL";
  closeDrop();
  render();
});

btnApply.addEventListener("click", ()=>{
  if(!currentKey) return;
  filters[currentKey] = selectedVal;
  closeDrop();
  render();
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDrop();
});
