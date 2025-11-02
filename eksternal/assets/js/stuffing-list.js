import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { firebaseConfig } from "./firebase-handler.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const tableContainer = document.getElementById("table-container");

// load layout tabel
fetch("../layout/stuffing-list.html")
  .then(res => res.text())
  .then(html => {
    tableContainer.innerHTML = html;
  });

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("agent-btn")) {
    const agent = e.target.dataset.agent;
    loadStuffingList(agent);
  }
});

async function loadStuffingList(agent) {
  const tbody = document.getElementById("stuffing-table-body");
  tbody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Loading data...</td></tr>";

  try {
    const snapshot = await get(child(ref(db), `stuffingList/${agent}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      let rows = "";
      let i = 1;
      for (const key in data) {
        const d = data[key];
        rows += `
          <tr>
            <td>${i++}</td>
            <td>${d.container || "-"}</td>
            <td>${d.vessel || "-"}</td>
            <td>${d.pol || "-"}</td>
            <td>${d.pod || "-"}</td>
            <td>${d.eta || "-"}</td>
            <td>${d.etd || "-"}</td>
          </tr>`;
      }
      tbody.innerHTML = rows;
    } else {
      tbody.innerHTML = `<tr><td colspan='7' style='text-align:center;'>Tidak ada data untuk ${agent}</td></tr>`;
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan='7' style='text-align:center;color:red;'>Gagal memuat data.</td></tr>`;
  }
}
