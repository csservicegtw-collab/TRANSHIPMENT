const STORAGE_KEY = "astro_vessels";
let vessels = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

const tableBody = document.querySelector("#vesselTable tbody");
const addForm = document.getElementById("addForm");

function renderTable() {
  tableBody.innerHTML = "";
  vessels.forEach((v, i) => {
    const row = `
      <tr>
        <td>${v.name}</td>
        <td>${v.type}</td>
        <td>
          <button onclick="openVessel('${v.name}')">Lihat</button>
          <button onclick="deleteVessel(${i})">Hapus</button>
        </td>
      </tr>
    `;
    tableBody.insertAdjacentHTML("beforeend", row);
  });
}

function openVessel(name) {
  localStorage.setItem("current_vessel", name);
  location.href = "vessel.html";
}

function deleteVessel(i) {
  if (confirm("Hapus vessel ini?")) {
    vessels.splice(i, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vessels));
    renderTable();
  }
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = addForm.vesselName.value.trim();
  const type = addForm.vesselType.value;
  if (name && !vessels.some(v => v.name === name)) {
    vessels.push({ name, type });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vessels));
    addForm.reset();
    renderTable();
  }
});

function filterVessel() {
  const keyword = document.getElementById("search").value.toLowerCase();
  const filterType = document.getElementById("filterType").value;
  const rows = tableBody.getElementsByTagName("tr");
  for (let row of rows) {
    const text = row.innerText.toLowerCase();
    const matchType = filterType === "all" || text.includes(filterType.toLowerCase());
    row.style.display = text.includes(keyword) && matchType ? "" : "none";
  }
}

renderTable();
