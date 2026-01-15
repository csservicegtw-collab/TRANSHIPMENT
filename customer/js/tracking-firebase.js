/**
 * ============================================================
 * customer/js/tracking-firebase.js  (FINAL)
 * Firebase Realtime DB - Customer Tracking Page
 * Compatible with GitHub Pages (Firebase Web SDK v9 - module)
 * ============================================================
 *
 * Expected HTML IDs (optional but recommended):
 * - #loading
 * - #errorBox
 * - #resultBox
 * - #notFoundBox
 * - #trackingKey
 * - #trackingValue
 * - #companyName
 * - #tableInfo
 * - #shipmentStatus
 * - #lastUpdate
 * - #timelineContainer
 *
 * URL query support:
 * - ?bl=xxxx
 * - ?cn=xxxx
 * - ?id=xxxx
 * - ?key=xxxx   (alternative)
 *
 * Firebase DB expected structure (recommended):
 * shipments/
 *   <TRACKING_KEY>/
 *      bl: "..."
 *      cn: "..."
 *      shipper: "..."
 *      consignee: "..."
 *      pol: "..."
 *      pod: "..."
 *      vessel: "..."
 *      voyage: "..."
 *      eta: "..."
 *      etd: "..."
 *      status: "..."
 *      lastUpdate: 1700000000000
 *      timeline:
 *        - { title: "...", desc: "...", date: "...", time: "...", location: "...", ts: 1700... }
 *
 * If your structure is different, tell me and I will adjust.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  onValue,
  query,
  orderByChild,
  equalTo,
  limitToFirst
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

/** ============================================================
 *  1) Firebase Config (EDIT THIS PART ONLY)
 * ============================================================ */
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://PASTE_YOUR_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "PASTE_YOUR_PROJECT",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

/** ============================================================
 *  2) App Init
 * ============================================================ */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/** ============================================================
 *  3) Helpers
 * ============================================================ */
const $ = (id) => document.getElementById(id);

function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }

function setText(id, text = "") {
  const el = $(id);
  if (!el) return;
  el.textContent = text ?? "";
}

function escapeHTML(str) {
  if (typeof str !== "string") return str ?? "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(tsOrString) {
  if (!tsOrString) return "-";

  // if ts number
  if (typeof tsOrString === "number") {
    try {
      const d = new Date(tsOrString);
      return d.toLocaleString("id-ID", { hour12: false });
    } catch (e) {}
  }

  // if ISO string / plain string
  return String(tsOrString);
}

function getQueryParams() {
  const url = new URL(window.location.href);
  const params = Object.fromEntries(url.searchParams.entries());
  return params;
}

/**
 * Determine which key to use for lookup
 * Priority: id > bl > cn > key
 */
function resolveTrackingKey(params) {
  return params.id || params.bl || params.cn || params.key || "";
}

/**
 * Try normalize input (remove spaces)
 */
function normalizeKey(key) {
  return String(key || "")
    .trim()
    .replace(/\s+/g, "");
}

/** ============================================================
 *  4) UI State
 * ============================================================ */
function setStateLoading() {
  show($("loading"));
  hide($("errorBox"));
  hide($("resultBox"));
  hide($("notFoundBox"));
}

function setStateError(msg) {
  hide($("loading"));
  show($("errorBox"));
  hide($("resultBox"));
  hide($("notFoundBox"));
  setText("errorBox", msg);
}

function setStateNotFound() {
  hide($("loading"));
  hide($("errorBox"));
  hide($("resultBox"));
  show($("notFoundBox"));
}

function setStateResult() {
  hide($("loading"));
  hide($("errorBox"));
  show($("resultBox"));
  hide($("notFoundBox"));
}

/** ============================================================
 *  5) Render Shipment
 * ============================================================ */
function renderShipment(shipment, trackingKey, trackingType) {
  setStateResult();

  setText("trackingKey", trackingType.toUpperCase());
  setText("trackingValue", trackingKey);

  // Common fields
  setText("companyName", shipment.company || shipment.companyName || shipment.shipper || "-");
  setText("shipmentStatus", shipment.status || shipment.currentStatus || "-");
  setText("lastUpdate", formatDate(shipment.lastUpdate || shipment.updatedAt || shipment.updateTime));

  // Optional summary info (if you have these HTML IDs)
  setText("blNo", shipment.bl || shipment.BL || shipment.blNo || "-");
  setText("cnNo", shipment.cn || shipment.CN || shipment.container || shipment.containerNo || "-");
  setText("pol", shipment.pol || shipment.POL || "-");
  setText("pod", shipment.pod || shipment.POD || "-");
  setText("vessel", shipment.vessel || shipment.vesselName || "-");
  setText("voyage", shipment.voyage || shipment.voy || "-");
  setText("etd", shipment.etd || shipment.ETD || "-");
  setText("eta", shipment.eta || shipment.ETA || "-");

  // Timeline
  renderTimeline(shipment.timeline || shipment.history || []);
}

function renderTimeline(timeline) {
  const wrap = $("timelineContainer");
  if (!wrap) return;

  // normalize to array
  let list = [];
  if (Array.isArray(timeline)) list = timeline;
  else if (typeof timeline === "object" && timeline !== null) {
    // if stored as map in RTDB
    list = Object.values(timeline);
  }

  // sort by ts if exists
  list.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  if (list.length === 0) {
    wrap.innerHTML = `<div class="timeline-empty">Belum ada timeline.</div>`;
    return;
  }

  const html = list
    .map((x) => {
      const title = escapeHTML(x.title || x.status || "Update");
      const desc = escapeHTML(x.desc || x.description || "");
      const loc = escapeHTML(x.location || x.place || "");
      const dt = escapeHTML(x.date || "");
      const tm = escapeHTML(x.time || "");
      const stamp = x.ts ? formatDate(x.ts) : `${dt} ${tm}`.trim();

      return `
        <div class="timeline-item">
          <div class="timeline-title">${title}</div>
          <div class="timeline-meta">
            <span>${escapeHTML(stamp || "-")}</span>
            ${loc ? `<span> • ${loc}</span>` : ""}
          </div>
          ${desc ? `<div class="timeline-desc">${desc}</div>` : ""}
        </div>
      `;
    })
    .join("");

  wrap.innerHTML = html;
}

/** ============================================================
 *  6) Firebase Lookup Logic
 * ============================================================ */

/**
 * Direct lookup by key
 * shipments/<key>
 */
async function fetchByPrimaryKey(key) {
  const snap = await get(ref(db, `shipments/${key}`));
  if (!snap.exists()) return null;
  return { key, data: snap.val() };
}

/**
 * Search by child attribute
 * shipments where bl == value
 * shipments where cn == value
 */
async function fetchByChild(field, value) {
  const shipmentsRef = ref(db, "shipments");
  const q = query(shipmentsRef, orderByChild(field), equalTo(value), limitToFirst(1));
  const snap = await get(q);
  if (!snap.exists()) return null;

  const obj = snap.val();
  const firstKey = Object.keys(obj)[0];
  return { key: firstKey, data: obj[firstKey] };
}

/**
 * Realtime listen by key
 */
function listenRealtime(key, onData, onNotFound, onError) {
  const shipmentRef = ref(db, `shipments/${key}`);
  return onValue(
    shipmentRef,
    (snap) => {
      if (!snap.exists()) return onNotFound();
      onData(snap.val());
    },
    (err) => onError(err)
  );
}

/** ============================================================
 *  7) Main
 * ============================================================ */
async function main() {
  try {
    setStateLoading();

    const params = getQueryParams();
    let keyInput = resolveTrackingKey(params);
    keyInput = normalizeKey(keyInput);

    if (!keyInput) {
      setStateError("Tracking key tidak ditemukan di URL. Gunakan ?bl= / ?cn= / ?id=");
      return;
    }

    // Determine type
    let type = "id";
    if (params.bl) type = "bl";
    else if (params.cn) type = "cn";
    else if (params.key) type = "key";

    // 1) First try direct key: shipments/<keyInput>
    let found = await fetchByPrimaryKey(keyInput);

    // 2) If not found, try search by BL/CN only if query indicates
    if (!found && type === "bl") {
      found = await fetchByChild("bl", keyInput);
    }
    if (!found && type === "cn") {
      found = await fetchByChild("cn", keyInput);
    }

    // 3) if still not found, attempt generic search:
    // - try match bl
    // - try match cn
    // Useful when user uses ?id= but your db uses auto keys.
    if (!found) {
      found = (await fetchByChild("bl", keyInput)) || (await fetchByChild("cn", keyInput));
    }

    if (!found) {
      setStateNotFound();
      return;
    }

    // Render initial
    renderShipment(found.data, keyInput, type);

    // Realtime listener by actual key in DB
    listenRealtime(
      found.key,
      (data) => renderShipment(data, keyInput, type),
      () => setStateNotFound(),
      (err) => setStateError("Firebase listener error: " + err.message)
    );
  } catch (err) {
    console.error(err);
    setStateError("Terjadi kesalahan: " + (err?.message || err));
  }
}

document.addEventListener("DOMContentLoaded", main);
