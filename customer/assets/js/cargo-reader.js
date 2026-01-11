import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// ✅ Firebase config (dari project kamu)
const firebaseConfig = {
  apiKey: "AIzaSyAu0br1o29T7QM7StyHezHlZ67WiVsTzx0",
  authDomain: "transshipment-8c2da.firebaseapp.com",
  projectId: "transshipment-8c2da",
  storageBucket: "transshipment-8c2da.appspot.com",
  messagingSenderId: "997549413633",
  appId: "1:997549413633:web:b173bddaf4b73cccd13700",
  measurementId: "G-21L0CZJ1MC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);

function showMsg(text, type = "success") {
  const el = $("msg");
  el.className = `msg ${type}`;
  el.textContent = text;
  el.style.display = "block";
}
function hideMsg() {
  $("msg").style.display = "none";
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeKey(input) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function setHeader(data = {}) {
  $("statusText").textContent = data.status || "-";
  $("updatedText").textContent = data.updatedAt || "-";
  $("originText").textContent = data.origin || "-";
  $("destText").textContent = data.destination || "-";
  $("vesselText").textContent = data.vessel || "-";
  $("etaText").textContent = data.eta || "-";
}

function renderTimeline(events = []) {
  const body = $("timelineBody");

  if (!events || events.length === 0) {
    body.innerHTML = `<tr><td colspan="3" class="muted">Tidak ada event timeline.</td></tr>`;
    return;
  }

  body.innerHTML = events.map((ev) => `
    <tr>
      <td class="nowrap">${escapeHtml(ev.date || "-")}</td>
      <td>${escapeHtml(ev.location || "-")}</td>
      <td>${escapeHtml(ev.description || "-")}</td>
    </tr>
  `).join("");
}

async function searchCargo() {
  hideMsg();

  const dest = localStorage.getItem("cust_destination") || "";
  const agent = localStorage.getItem("cust_agent") || "";

  const key = normalizeKey($("trackingInput").value);

  if (!dest) {
    showMsg("Destination belum dipilih. Kembali dan pilih destination.", "warning");
    return;
  }
  if (!key) {
    showMsg("Masukkan Container / BL / Booking dulu.", "warning");
    return;
  }

  $("timelineBody").innerHTML = `<tr><td colspan="3" class="muted">Loading...</td></tr>`;

  try {
    /**
     * ✅ Struktur Firestore yang disarankan:
     * cargo_tracking/{destination}/shipments/{trackingKey}
     *
     * Jika mau pakai agent juga:
     * cargo_tracking/{destination}_{agent}/shipments/{trackingKey}
     */
    const destinationKey = agent ? `${dest}_${agent}` : dest;

    const ref = doc(db, "cargo_tracking", destinationKey, "shipments", key);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      setHeader({});
      renderTimeline([]);
      showMsg("Data tracking tidak ditemukan. Pastikan nomor benar atau data belum diinput admin.", "warning");
      return;
    }

    const data = snap.data();
    setHeader(data);
    renderTimeline(data.events || []);
    showMsg("Data tracking ditemukan ✅", "success");

  } catch (err) {
    console.error(err);
    showMsg("Gagal mengambil data cargo. Cek koneksi & rules Firestore.", "danger");
    $("timelineBody").innerHTML = `<tr><td colspan="3">Error load data.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const dest = localStorage.getItem("cust_destination") || "-";
  const agent = localStorage.getItem("cust_agent") || "-";

  $("destLabel").textContent = dest;
  $("agentLabel").textContent = agent;

  $("btnSearch").addEventListener("click", searchCargo);
  $("trackingInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchCargo();
  });
});
