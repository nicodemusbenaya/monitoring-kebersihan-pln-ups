import fs from "fs";

const content = fs.readFileSync("./tmp_scripts.js", "utf8");

function printFunc(name) {
  const idx = content.indexOf(`function ${name}`);
  if (idx !== -1) {
    console.log(`\n=================== ${name} ===================`);
    console.log(content.slice(idx, idx + 1500));
  }
}

printFunc("renderLogin");
printFunc("renderHeader");
printFunc("renderScannerHome");
printFunc("renderSlotSelection");
printFunc("renderChecklist");
