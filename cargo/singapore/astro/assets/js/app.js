/***********************
 * STORAGE
 ***********************/
const DATA_KEY = "sg_astro_data_excel_FINAL_V2";
let cargos = JSON.parse(localStorage.getItem(DATA_KEY)) || [];

const tbody = document.getElementById("tableBody");
const btnImport = document.getElementById("btnImport");
const excelFile = document.getElementById("excelFile");
const searchAll = document.getElementById("searchAll");

/***********************
 * HELPERS
 ***********************/
function saveLocal() {
  localStorage.setItem(DATA_KEY, JSON.stringify(cargos));
}

function normalizeBL(v) {
  return (v || "").toString().trim().toUpperCase().replace(/\s+/g, "");
}

// DATE format on blur only
function parseAndFormatDate(raw) {
  if (!raw) return "";
  let v = String(raw).trim();
  if (!v) return "";

  v = v.replace(/[.\-\s]+/g, "/");
  v = v.replace(/\/+/g, "/");

  const parts = v.split("/").filter(Boolean);
  if (parts.length < 3) return v;

  let d = (parts[0] || "").replace(/\D/g, "");
  let m = (parts[1] || "").replace(/\D/g, "");
  let y = (parts[2] || "").replace(/\D/g, "");

  if (!d || !m || !y) return v;

  d = d.padStart(2, "0");
  m = m.padStart(2, "0");

  if (y.length === 2) y = "20" + y;
  if (y.length !== 4) return v;

  return `${d}/${m}/${y}`;
}

function bindDateInput(inp) {
  if (!inp) return;
  const doFormat = () => {
    const f = parseAndFormatDate(inp.value);
    if (f && f !== inp.value) inp.value = f;
  };
  inp.addEventListener("blur", doFormat);
}

/***********************
 * SEARCH
 ***********************/
function matchSearch(row) {
  const q = (searchAll?.value || "").trim().toLowerCase();
  if (!q) return true;

  const doneText = row.done ? "DONE" : "NOT DONE";

  const merged = [
    row.mv,
    row.stuffingDate,
    row.etdPol,
    row.etaTsPort,
    row.bl,
    row.destination,
    row.etdTsPort,
    row.etaDestination,
    row.inland,
    row.doRelease,
    row.cargoRelease,
    doneText
  ]
    .join(" ")
    .toLowerCase();

  return merged.includes(q);
}

/***********************
 * FILTER STATE (Excel checkbox)
 ***********************/
const filters = {}; 
// contoh: filters["destination"] = Set(["SEMARANG","JAKARTA"])
// kalau tidak ada / kosong -> berarti ALL

function getRowValue(row, key) {
  if (key === "action") return row.done ? "DONE" : "NOT DONE";
  return (row[key] ?? "").toString().trim();
}

function matchFilters(row) {
  for (const key in filters) {
    const selectedSet = filters[key];
    if (!selectedSet || selectedSet.size === 0) continue; // ALL
    const value = getRowValue(row, key);
    if (!selectedSet.has(value)) return false;
  }
  return true;
}

/***********************
 * INLINE EDIT
 ***********************/
function setCellEditable(td, rowId, field, opts = {}) {
  const { isDate = false, isBL = false } = opts;
  td.classList.add("editable");

  td.addEventListener("click", () => {
    if (td.querySelector("input")) return;
    const row = cargos.find((x) => x.id === rowId);
    if (!row) return;

    // kalau done, tetap boleh edit (sesuai request kamu)
    const old = td.textContent.trim();

    const input = document.createElement("input");
    input.value = old;
    input.style.width = "100%";
    input.style.border = "1px solid #cbd5e1";
    input.style.borderRadius = "6px";
    input.style.padding = "6px";
    input.style.fontSize = "12px";

    td.innerHTML = "";
    td.appendChild(input);

    input.focus();
    input.select();

    if (isDate) bindDateInput(input);

    const commit = () => {
      let val = input.value.trim();

      if (isBL) {
        val = normalizeBL(val);
        if (!val) {
          td.innerHTML = row.bl;
          return;
        }
        // duplicate BL prevent
        const dup = cargos.some((x) => x.id !== rowId && normalizeBL(x.bl) === val);
        if (dup) {
          alert("BL NO ALREADY EXISTS!");
          td.innerHTML = row.bl;
          return;
        }
      }

      if (isDate) val = parseAndFormatDate(val);

      row[field] = val;
      saveLocal();
      td.innerHTML = val;
      render();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") td.innerHTML = old;
    });
  });
}

/***********************
 * RENDER TABLE
 ***********************/
function render() {
  tbody.innerHTML = "";

  cargos
    .filter(matchSearch)
    .filter(matchFilters)
    .forEach((r) => {
      const tr = document.createElement("tr");
      if (r.done) tr.classList.add("done");

      tr.innerHTML = `
        <td class="c-mv">${r.mv || ""}</td>
        <td class="c-stuffing">${r.stuffingDate || ""}</td>
        <td class="c-etdpol">${r.etdPol || ""}</td>
        <td class="c-etats">${r.etaTsPort || ""}</td>

        <td class="c-bl">${r.bl || ""}</td>
        <td class="c-dest">${r.destination || ""}</td>
        <td class="c-etdts">${r.etdTsPort || ""}</td>
        <td class="c-etadest">${r.etaDestination || ""}</td>
        <td class="c-inland">${r.inland || ""}</td>
        <td class="c-dr">${r.doRelease || ""}</td>
        <td class="c-cr">${r.cargoRelease || ""}</td>

        <td class="action-cell">
          <label class="chk-wrap">
            <input class="chk" type="checkbox" data-id="${r.id}" ${r.done ? "checked" : ""}>
            <span class="chk-text">${r.done ? "SHIPMENT DONE" : "MARK DONE"}</span>
          </label>
          <button class="del" data-id="${r.id}" title="DELETE">🗑️</button>
        </td>
      `;

      tbody.appendChild(tr);

      // inline editable semua kolom penting
      setCellEditable(tr.querySelector(".c-mv"), r.id, "mv");
      setCellEditable(tr.querySelector(".c-stuffing"), r.id, "stuffingDate", { isDate: true });
      setCellEditable(tr.querySelector(".c-etdpol"), r.id, "etdPol", { isDate: true });
      setCellEditable(tr.querySelector(".c-etats"), r.id, "etaTsPort", { isDate: true });

      setCellEditable(tr.querySelector(".c-bl"), r.id, "bl", { isBL: true });
      setCellEditable(tr.querySelector(".c-dest"), r.id, "destination");
      setCellEditable(tr.querySelector(".c-etdts"), r.id, "etdTsPort", { isDate: true });
      setCellEditable(tr.querySelector(".c-etadest"), r.id, "etaDestination", { isDate: true });
      setCellEditable(tr.querySelector(".c-inland"), r.id, "inland");
      setCellEditable(tr.querySelector(".c-dr"), r.id, "doRelease", { isDate: true });
      setCellEditable(tr.querySelector(".c-cr"), r.id, "cargoRelease", { isDate: true });
    });

  bindEvents();
}
render();

/***********************
 * EVENTS (DONE toggle & delete)
 ***********************/
function bindEvents() {
  tbody.querySelectorAll(".chk").forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = Number(cb.dataset.id);
      const row = cargos.find((x) => x.id === id);
      if (!row) return;

      // ✅ bisa dicentang / dibatalkan centang
      row.done = cb.checked;
      saveLocal();
      render();
    });
  });

  tbody.querySelectorAll(".del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      if (confirm("DELETE THIS ROW?")) {
        cargos = cargos.filter((x) => x.id !== id);
        saveLocal();
        render();
      }
    });
  });
}

/***********************
 * IMPORT EXCEL
 ***********************/
btnImport?.addEventListener("click", () => excelFile.click());

excelFile?.addEventListener("change", async () => {
  const file = excelFile.files?.[0];
  if (!file) return;

  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    let added = 0;

    for (const r of rows) {
      const mv = String(r["MOTHER VESSEL"] || r["MV"] || "").trim().toUpperCase();
      const stuffingDate = parseAndFormatDate(r["STUFFING DATE"] || "");
      const etdPol = parseAndFormatDate(r["ETD POL"] || "");
      const etaTsPort = parseAndFormatDate(r["ETA TS PORT"] || r["ETA SIN/HKG"] || "");

      const bl = normalizeBL(r["BL NO"] || r["BL"] || "");
      const destination = String(r["DESTINATION"] || r["POD"] || "").trim().toUpperCase();

      if (!bl || !destination) continue;
      if (cargos.some((x) => normalizeBL(x.bl) === bl)) continue;

      cargos.unshift({
        id: Date.now() + Math.floor(Math.random() * 9999),

        mv,
        stuffingDate,
        etdPol,
        etaTsPort,

        bl,
        destination,
        etdTsPort: parseAndFormatDate(r["ETD TS PORT"] || ""),
        etaDestination: parseAndFormatDate(r["ETA DESTINATION"] || r["ETA POD"] || ""),
        inland: String(r["INLAND"] || "-").trim().toUpperCase(),
        doRelease: parseAndFormatDate(r["DO RELEASE"] || r["DR"] || ""),
        cargoRelease: parseAndFormatDate(r["CARGO RELEASE"] || r["CR"] || ""),

        done: false
      });

      added++;
    }

    saveLocal();
    render();
    alert(`IMPORT SUCCESS ✅\nADDED: ${added} ROW(S)`);
  } catch (e) {
    console.error(e);
    alert("FAILED TO IMPORT EXCEL. CHECK FORMAT!");
  } finally {
    excelFile.value = "";
  }
});

/***********************
 * LIVE SEARCH
 ***********************/
searchAll?.addEventListener("input", render);

/***********************
 * FILTER UI (Excel checkbox)
 ***********************/
(function injectFilters() {
  const ths = document.querySelectorAll("thead th");

  // mapping header index -> field key
  // SESUAI URUTAN HEADER kamu (ACTION terakhir)
  const map = {
    0: "mv",
    1: "stuffingDate",
    2: "etdPol",
    3: "etaTsPort",
    4: "bl",
    5: "destination",
    6: "etdTsPort",
    7: "etaDestination",
    8: "inland",
    9: "doRelease",
    10: "cargoRelease",
    11: "action" // DONE/NOT DONE
  };

  ths.forEach((th, idx) => {
    const key = map[idx];
    if (!key) return;

    const label = th.textContent.trim();
    th.innerHTML = `
      <div class="th-flex">
        <span>${label}</span>
        <button type="button" class="filter-btn" data-key="${key}">▼</button>
      </div>
    `;
  });
})();

/***********************
 * DROPDOWN UI
 ***********************/
const drop = document.createElement("div");
drop.className = "dropdown";
drop.innerHTML = `
  <div class="drop-head">FILTER</div>
  <div class="drop-search">
    <input id="dropSearch" type="text" placeholder="SEARCH...">
  </div>
  <div class="drop-selectall">
    <label><input id="chkAll" type="checkbox"> SELECT ALL</label>
  </div>
  <div class="drop-list" id="dropList"></div>
  <div class="drop-foot">
    <button type="button" id="btnClear">CLEAR</button>
    <button type="button" id="btnApply">APPLY</button>
  </div>
`;
document.body.appendChild(drop);

const dropSearch = drop.querySelector("#dropSearch");
const chkAll = drop.querySelector("#chkAll");
const dropList = drop.querySelector("#dropList");
const btnClear = drop.querySelector("#btnClear");
const btnApply = drop.querySelector("#btnApply");

let currentKey = null;
let tempSelected = new Set();

function getUniqueValues(key) {
  if (key === "action") return ["DONE", "NOT DONE"];

  const values = cargos
    .map((r) => getRowValue(r, key))
    .map((v) => (v || "-").trim());

  const uniq = Array.from(new Set(values));
  uniq.sort((a, b) => String(a).localeCompare(String(b)));
  return uniq;
}

function renderDrop(values, q = "") {
  const query = q.trim().toLowerCase();
  dropList.innerHTML = "";

  const filtered = values.filter((v) => String(v).toLowerCase().includes(query));

  filtered.forEach((v) => {
    const row = document.createElement("div");
    row.className = "drop-item";

    const checked = tempSelected.has(v);

    row.innerHTML = `
      <label class="drop-check">
        <input type="checkbox" ${checked ? "checked" : ""} data-val="${v}">
        <span>${v}</span>
      </label>
    `;

    dropList.appendChild(row);
  });

  // update select all
  chkAll.checked = filtered.length > 0 && filtered.every((v) => tempSelected.has(v));
}

function openDrop(btn, key) {
  currentKey = key;

  // clone existing selection
  tempSelected = new Set(filters[key] ? Array.from(filters[key]) : []);

  // default ALL -> semua terpilih
  const values = getUniqueValues(key);
  if (tempSelected.size === 0) {
    values.forEach((v) => tempSelected.add(v));
  }

  dropSearch.value = "";
  renderDrop(values, "");

  // posisi dropdown tepat dibawah tombol filter
  const rect = btn.getBoundingClientRect();
  drop.style.left = rect.left + window.scrollX + "px";
  drop.style.top = rect.bottom + window.scrollY + 6 + "px";
  drop.style.display = "block";

  setTimeout(() => dropSearch.focus(), 0);
}

function closeDrop() {
  drop.style.display = "none";
  currentKey = null;
}

/***********************
 * dropdown interactions
 ***********************/
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-btn");
  if (btn) {
    e.stopPropagation();
    openDrop(btn, btn.dataset.key);
    return;
  }

  // click outside close
  if (drop.style.display === "block" && !drop.contains(e.target)) closeDrop();
});

// checkbox click
drop.addEventListener("change", (e) => {
  const cb = e.target;
  if (!(cb instanceof HTMLInputElement)) return;

  if (cb.id === "chkAll") {
    // select all visible values
    const values = getUniqueValues(currentKey);
    if (cb.checked) {
      values.forEach((v) => tempSelected.add(v));
    } else {
      tempSelected.clear();
    }
    renderDrop(values, dropSearch.value);
    return;
  }

  const val = cb.dataset.val;
  if (!val) return;

  if (cb.checked) tempSelected.add(val);
  else tempSelected.delete(val);
});

// search inside dropdown
dropSearch.addEventListener("input", () => {
  if (!currentKey) return;
  renderDrop(getUniqueValues(currentKey), dropSearch.value);
});

// clear
btnClear.addEventListener("click", () => {
  if (!currentKey) return;
  delete filters[currentKey]; // ALL
  closeDrop();
  render();
});

// apply
btnApply.addEventListener("click", () => {
  if (!currentKey) return;

  // kalau semua kepilih -> anggap ALL
  const allVals = getUniqueValues(currentKey);
  const isAllSelected = allVals.length > 0 && allVals.every((v) => tempSelected.has(v));

  if (isAllSelected) {
    delete filters[currentKey];
  } else {
    filters[currentKey] = new Set(tempSelected);
  }

  closeDrop();
  render();
});

// esc close
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrop();
});
