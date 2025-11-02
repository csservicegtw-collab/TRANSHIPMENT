import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { firebaseConfig } from "./firebase-handler.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const tableContainer = document.getElementById("table-container");

// Pastikan layout tabel dimuat dulu sebelum event berjalan
async function loadLayout() {
  const res = await fetch("../layout/stuffing-list.html");
  const html = await res.text();
  tableContainer.innerHTML = html;
}
await loadLayout();

const tbody = () => document.getElementById("stuffing-table-body");

// Event tombol agent
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("agent-btn")) {
    const agent = e.target.dataset.agent;
    await loadStuffingList(agent);
  }
});

// Fungsi ambil data dari Firebase
async function loadStuffingList(agent) {
  const body = tbody();
  if (!body) return;
  body.innerHTML = `<tr><td colspan='7' style='text-align:center;'>Memuat data ${agent}...</td></tr>`;

  try {
    const snapshot = await get(child(ref(db), `stuffingList/${agent}`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      let html = "";
      let no = 1;

      Object.keys(data).forEach(key => {
        const d = data[key];
        html += `
          <tr>
            <td>${no++}</td>
            <td>${d.container || "-"}</td>
            <td>${d.vessel || "-"}</td>
            <td>${d.pol || "-"}</td>
            <td>${d.pod || "-"}</td>
            <td>${d.eta || "-"}</td>
            <td>${d.etd || "-"}</td>
          </tr>
        `;
      });

      body.innerHTML = html;
    } else {
      body.innerHTML = `<tr><td colspan='7' style='text-align:center;'>Tidak ada data untuk ${agent}.</td></tr>`;
    }
  } catch (error) {
    console.error("Gagal ambil data:", error);
    body.innerHTML = `<tr><td colspan='7' style='text-align:center;color:red;'>Terjadi kesalahan.</td></tr>`;
  }
}
