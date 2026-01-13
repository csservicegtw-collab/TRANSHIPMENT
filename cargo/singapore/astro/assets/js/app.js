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
  etaPod: "ALL",
  mv: "ALL",
  connectVessel: "ALL",
  dr: "ALL",
  cr: "ALL",
  done: "ALL" // ALL / DONE / NOT_DONE
};

/* =======================
   DATE PARSER
   ======================= */
function parseAndFormatDate(raw){
  if(!raw) return "";
  let v = String(raw).trim();
  if(!v) return "";

  v = v.replace(/[.\-\s]+/g, "/");
  v = v.replace(/\/+/g, "/");

  const parts = v.split("/").filter(Boolean);
  if(parts.length < 3) return raw;

  let d = (parts[0] || "").replace(/\D/g,"");
  let m = (parts[1] || "").replace(/\D/g,"");
  let y = (parts[2] || "").replace(/\D/g,"");

  if(!d || !m || !y) return raw;

  d = d.padStart(2,"0");
  m = m.padStart(2,"0");

  if(y.length === 2) y = "20" + y;
  if(y.length === 1) y = "200" + y;
  if(y.length !== 4) return raw;

  const di = Number(d), mi = Number(m);
  if(di < 1 || di > 31 || mi < 1 || mi > 12) return raw;

  return `${d}/${m}/${y}`;
}

function isDateComplete(raw){
  if(!raw) return false;
  const v = String(raw).trim();
  const sepCount = (v.match(/[\/\-\.\s]/g) || []).length;
  return sepCount >= 2;
}

function debounce(fn, delay=250){
  let t=null;
  return (...args)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...args), delay);
  };
}

function bindDateInput(inp){
  if(!inp) return;

  const doFormat = ()=>{
    const formatted = parseAndFormatDate(inp.value);
    if(formatted && formatted !== inp.value) inp.value = formatted;
  };

  inp.addEventListener("blur", doFormat);

  inp.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") doFormat();
  });

  const debounced = debounce(()=>{
    if(isDateComplete(inp.value)) doFormat();
  }, 220);

  inp.addEventListener("input", debounced);
}

/* ✅ bind date inputs (master + detail) */
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
  const rowMv = master.mv || "";

  if(filters.mv !== "ALL" && rowMv !== filters.mv) return false;
  if(filters.etaPod !== "ALL" && (row.etaPod||"") !== filters.etaPod) return false;
  if(filters.connectVessel !== "ALL" && (row.connectVessel||"") !== filters.connectVessel) return false;
  if(filters.dr !== "ALL" && (row.dr||"") !== filters.dr) return false;
  if(filters.cr !== "ALL" && (row.cr||"") !== filters.cr) return false;

  if(filters.done === "DONE" && row.done !== true) return false;
  if(filters.done === "NOT_DONE" && row.done !== false) return false;

  return true;
}

/* =======================
   INLINE EDIT
   ======================= */
function setCellEditable(td, id, field, opts={}){
  const { isDate=false, isBL=false } = opts;

  td.classList.add("editable");
  td.style.cursor="text";

  td.addEventListener("click", ()=>{
    if(td.querySelector("input")) return;

    const row = cargos.find(x=>x.id===id);
    if(!row) return;

    const old = td.textContent.trim();
    const input = document.createElement("input");
    input.value = old;

    input.style.width = "100%";
    input.style.padding = "6px";
    input.style.fontSize = "12px";
    input.style.border = "1px solid #cbd5e1";
    input.style.borderRadius = "6px";

    td.innerHTML = "";
    td.appendChild(input);
    input.focus();
    input.select();

    if(isDate) bindDateInput(input);

    const commit = ()=>{
      let val = input.value.trim();

      if(isBL){
        val = normalizeBL(val);

        // ✅ prevent empty BL
        if(!val){
          alert("BL NO CANNOT BE EMPTY!");
          td.innerHTML = row.bl;
          return;
        }

        // ✅ prevent duplicate BL
        const dup = cargos.some(x => x.id !== id && normalizeBL(x.bl) === val);
        if(dup){
          alert("BL NO ALREADY EXISTS!");
          td.innerHTML = row.bl;
          return;
        }
      }

      if(isDate) val = parseAndFormatDate(val);

      // update & save
      row[field] = val;
      saveLocal();

      td.innerHTML = val;
      render(); // keep consistent UI (filter etc)
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e)=>{
      if(e.key==="Enter") commit();
      if(e.key==="Escape") td.innerHTML = old;
    });
  });
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
        <td class="c-bl">${r.bl}</td>
        <td class="c-dest">${r.destination}</td>
        <td>${master.etaTs || ""}</td>
        <td class="c-etdTs">${r.etdTs}</td>
        <td class="c-etaPod">${r.etaPod}</td>
        <td>${master.mv || ""}</td>
        <td class="c-connect">${r.connectVessel}</td>
        <td class="c-dr">${r.dr || ""}</td>
        <td class="c-cr">${r.cr || ""}</td>
        <td><input type="checkbox" ${r.done?"checked":""} data-id="${r.id}" class="chk"></td>
        <td>
          ${r.done
            ? `<span class="done-badge">SHIPMENT DONE</span>`
            : `<span class="action-btn del" data-id="${r.id}">🗑️</span>`
          }
        </td>
      `;

      tbody.appendChild(tr);

      // ✅ INLINE EDIT (NOW INCLUDE BL)
      setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", { isBL:true });
      setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");
      setCellEditable(tr.querySelector(".c-etdTs"), r.id, "etdTs", { isDate:true });
      setCellEditable(tr.querySelector(".c-etaPod"), r.id, "etaPod", { isDate:true });
      setCellEditable(tr.querySelector(".c-connect"), r.id, "connectVessel");
      setCellEditable(tr.querySelector(".c-dr"), r.id, "dr", { isDate:true });
      setCellEditable(tr.querySelector(".c-cr"), r.id, "cr", { isDate:true });
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
    alert("BL ALREADY EXISTS");
    btnSavePublish.disabled=false;
    isSaving=false;
    return;
  }

  const etdTsVal = parseAndFormatDate(document.getElementById("etdTs").value);
  const etaPodVal = parseAndFormatDate(document.getElementById("etaPod").value);
  const drVal = parseAndFormatDate(document.getElementById("dr").value);
  const crVal = parseAndFormatDate(document.getElementById("cr").value);

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
   FILTER DROPDOWN
   =========================== */
(function injectHeaderFilters(){
  const ths = document.querySelectorAll("thead th");
  const map = {
    4:"etaPod",
    5:"mv",
    6:"connectVessel",
    7:"dr",
    8:"cr",
    9:"done"
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
  if(key === "mv"){
    return master.mv ? ["ALL", master.mv] : ["ALL"];
  }

  if(key === "done"){
    return ["ALL", "DONE", "NOT DONE"];
  }

  const values = cargos.map(r => (r[key] ?? "")).filter(v=>v!=="");
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

  if(key === "done"){
    if(filters.done === "NOT_DONE") selectedVal = "NOT DONE";
    else if(filters.done === "DONE") selectedVal = "DONE";
    else selectedVal = "ALL";
  } else {
    selectedVal = filters[key] || "ALL";
  }

  dropTitle.textContent = `FILTER`;
  dropSearch.value="";

  const list = uniqueValues(key);
  renderDropList(list, "");

  const rect = btn.getBoundingClientRect();
  drop.style.left = (rect.left + window.scrollX) + "px";
  drop.style.top  = (rect.bottom + window.scrollY + 6) + "px";
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
  if(!currentKey) return;
  if(currentKey === "done") filters.done = "ALL";
  else filters[currentKey] = "ALL";
  closeDrop();
  render();
});

btnApply.addEventListener("click", ()=>{
  if(!currentKey) return;

  if(currentKey === "done"){
    if(selectedVal === "DONE") filters.done = "DONE";
    else if(selectedVal === "NOT DONE") filters.done = "NOT_DONE";
    else filters.done = "ALL";
  } else {
    filters[currentKey] = selectedVal;
  }

  closeDrop();
  render();
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape") closeDrop();
});
