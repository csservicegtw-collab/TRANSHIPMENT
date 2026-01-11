// external/assets/js/external-stuffing-viewer.js
import { fetchVessels, fetchVessel, fetchStuffingDetails } from "./firebase-handler.js";

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(msg, type = "info") {
  const el = $("msg");
  if (!el) return;
  el.className = `msg ${type}`;
  el.innerText = msg;
  el.style.display = "block";
}

function hideMessage() {
  const el = $("msg");
  if (!el) return;
  el.style.display = "none";
}

function setLoading(isLoading) {
  const btn = $("btnLoad");
  if (btn) btn.disabled = isLoading;
  $("loading").style.display = isLoading ? "block" : "none";
}

async function loadVessels(agent) {
  hideMessage();
  setLoading(true);

  try {
    const vessels = await fetchVessels(agent);

    const select = $("vesselSelect");
    select.innerHTML = `<option value="">-- pilih vessel --</option>`;

    vessels.forEach((v) => {
      const label = `${v.vessel || v.id} ${v.voyage ? `| Voyage ${v.voyage}` : ""}`;
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = label;
      select.appendChild(opt);
    });

    if (vessels.length === 0) {
      showMessage("Belum ada data vessel untuk agent ini.", "warning");
    } else {
      showMessage(`Data vessel ditemukan: ${vessels.length}`, "success");
    }
  } catch (err) {
    console.error(err);
    showMessage("Gagal mengambil data vessel. Periksa koneksi / rules Firestore.", "danger");
  } finally {
    setLoading(false);
  }
}

async function loadDetails(agent, vesselId) {
  hideMessage();
  $("resultHeader").innerHTML = "";
  $("resultBody").innerHTML = "";
  $("detailsCount").innerText = "-";

  if (!vesselId) return showMessage("Pilih vessel dulu.", "warning");

  setLoading(true);

  try {
    const vessel = await fetchVessel(agent, vesselId);
    const details = await fetchStuffingDetails(agent, vesselId);

    $("detailsCount").innerText = details.length;

    $("resultHeader").innerHTML = `
      <div class="card">
        <div><b>Agent:</b> ${escapeHtml(agent)}</div>
        <div><b>Vessel:</b> ${escapeHtml(vessel?.vessel || vesselId)}</div>
        <div><b>Voyage:</b> ${escapeHtml(vessel?.voyage || "-")}</div>
        <div><b>Last Update:</b> ${escapeHtml(vessel?.updatedAt || "-")}</div>
      </div>
    `;

    if (details.length === 0) {
      showMessage("Vessel ini belum punya detail stuffing.", "warning");
      return;
    }

    // render table
    const rows = details.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(d.shipper)}</td>
        <td>${escapeHtml(d.marking)}</td>
        <td>${escapeHtml(d.destination)}</td>
        <td>${escapeHtml(d.marketing)}</td>
        <td>${escapeHtml(d.updlc)}</td>
        <td>${escapeHtml(d.createdAt || "-")}</td>
      </tr>
    `).join("");

    $("resultBody").innerHTML = rows;

  } catch (err) {
    console.error(err);
    showMessage("Gagal load detail stuffing. Bisa karena rules Firestore belum allow read.", "danger");
  } finally {
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // default agent
  $("agent").value = "astro";

  $("btnLoad").addEventListener("click", async () => {
    const agent = $("agent").value;
    if (!agent) return showMessage("Pilih agent dulu.", "warning");
    await loadVessels(agent);
  });

  $("vesselSelect").addEventListener("change", async (e) => {
    const agent = $("agent").value;
    const vesselId = e.target.value;
    await loadDetails(agent, vesselId);
  });
});
