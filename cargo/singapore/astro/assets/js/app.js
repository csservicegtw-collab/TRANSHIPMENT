
function normHeader(h){
  return String(h||"")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,""); // remove spaces, (), -, _
}

// get value using flexible keys
function getValFlexible(row, keys=[]){
  for(const k of keys){
    // direct key
    if(row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== ""){
      return row[k];
    }

    // normalized matching
    const nk = normHeader(k);
    for(const rk in row){
      if(normHeader(rk) === nk){
        const v = row[rk];
        if(v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
    }
  }
  return "";
}

// choose sheet with most BL rows
function pickBestSheet(workbook){
  let bestName = workbook.SheetNames[0];
  let bestScore = -1;

  for(const name of workbook.SheetNames){
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws,{defval:""});
    let score = 0;

    for(const r of rows){
      const bl = getValFlexible(r, ["BL NO","BL","B/L","BILL OF LADING"]);
      if(String(bl).trim() !== "") score++;
    }

    if(score > bestScore){
      bestScore = score;
      bestName = name;
    }
  }

  return bestName;
}

btnImport.addEventListener("click", ()=>{
  if(!master.mv || !master.etdPol || !master.etaTs || !master.stuffingDate){
    alert("PLEASE SAVE MASTER DATA FIRST!");
    return;
  }
  excelFile.click();
});

excelFile.addEventListener("change", async ()=>{
  const file = excelFile.files?.[0];
  if(!file) return;

  try{
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf,{type:"array"});

    // ✅ auto select correct sheet
    const bestSheet = pickBestSheet(wb);
    const ws = wb.Sheets[bestSheet];

    const rows = XLSX.utils.sheet_to_json(ws,{defval:""});

    if(rows.length === 0){
      alert("EXCEL EMPTY ❌\nNo rows detected in sheet: " + bestSheet);
      return;
    }

    let added = 0;
    let skippedNoBL = 0;
    let skippedNoDest = 0;
    let skippedDup = 0;

    for(const r of rows){

      const blRaw = getValFlexible(r, ["BL NO","BL","B/L","BILL OF LADING"]);
      const destRaw = getValFlexible(r, ["DESTINATION","DESTINATION (POD)","POD","PORT OF DISCHARGE"]);

      const bl = normalizeBL(blRaw);
      const dest = String(destRaw||"").trim().toUpperCase();

      if(!bl){ skippedNoBL++; continue; }
      if(!dest){ skippedNoDest++; continue; }

      if(cargos.some(x=>normalizeBL(x.bl)===bl)){
        skippedDup++;
        continue;
      }

      // Date fields
      const etdTs = parseAndFormatDate(getValFlexible(r, ["ETD TS","ETD TS PORT","ETD TRANSSHIPMENT PORT"]));
      const etaPod = parseAndFormatDate(getValFlexible(r, ["ETA POD","ETA PORT OF DESTINATION","ETA PORT OF DISCHARGE"]));

      const connectVessel = String(getValFlexible(r, ["CONNECTING VESSEL","CONNECT VESSEL","CV","VSL CONNECTING"])||"")
        .trim().toUpperCase();

      const dr = parseAndFormatDate(getValFlexible(r, ["DO RELEASE","DR"]));
      const cr = parseAndFormatDate(getValFlexible(r, ["CARGO RELEASE","CR"]));

      cargos.unshift({
        id: Date.now()+Math.floor(Math.random()*9999),
        bl,
        destination: dest,
        etdTs,
        etaPod,
        connectVessel,
        dr,
        cr,
        done:false
      });

      added++;
    }

    saveLocal();
    render();

    // ✅ if added 0 show reason
    if(added === 0){
      alert(
        `IMPORT SUCCESS ✅ BUT NO ROW ADDED\n\n`+
        `SHEET: ${bestSheet}\n`+
        `TOTAL ROWS: ${rows.length}\n`+
        `SKIP: BL EMPTY = ${skippedNoBL}\n`+
        `SKIP: DESTINATION EMPTY = ${skippedNoDest}\n`+
        `SKIP: DUPLICATE BL = ${skippedDup}\n\n`+
        `CHECK YOUR EXCEL HEADER / DATA`
      );
      return;
    }

    alert(
      `IMPORT SUCCESS ✅\n\n`+
      `SHEET: ${bestSheet}\n`+
      `ADDED: ${added} ROW(S)\n`+
      `SKIP DUPLICATE: ${skippedDup}`
    );

  }catch(e){
    console.error(e);
    alert("FAILED TO IMPORT EXCEL ❌\nCHECK FORMAT OR XLSX SCRIPT NOT LOADED!");
  }finally{
    excelFile.value="";
  }
});
