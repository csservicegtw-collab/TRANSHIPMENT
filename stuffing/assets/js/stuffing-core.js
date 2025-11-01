document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.toLowerCase();
  let agent = "unknown";

  if (path.includes("astro")) agent = "astro";
  else if (path.includes("benkel")) agent = "benkel";
  else if (path.includes("charterlink")) agent = "charterlink";
  else if (path.includes("coload")) agent = "coload";

  const addForm = document.getElementById("addForm");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const vesselName = addForm.querySelector("#vesselName")?.value || "";
      const voyage = addForm.querySelector("#voyage")?.value || "";
      if (!vesselName) return alert("Nama vessel harus diisi!");

      let vessels = JSON.parse(localStorage.getItem("astro_vessels")) || [];
      vessels.push(vesselName);
      localStorage.setItem("astro_vessels", JSON.stringify(vessels));

      saveVesselData(agent, vesselName, voyage);
    });
  }

  const vesselForm = document.getElementById("vesselForm");
  if (vesselForm) {
    vesselForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const vesselName = localStorage.getItem("current_vessel") || "Unknown Vessel";

      const data = {
        shipper: vesselForm.shipper?.value || "",
        marking: vesselForm.marking?.value || "",
        destination: vesselForm.destination?.value || "",
        marketing: vesselForm.marketing?.value || "",
        updlc: vesselForm.updlc?.value || ""
      };

      saveVesselData(agent, vesselName, "-", data);
    });
  }
});
