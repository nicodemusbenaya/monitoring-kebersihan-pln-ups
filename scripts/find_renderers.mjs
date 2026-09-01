import fs from "fs";

const content = fs.readFileSync("./tmp_scripts.js", "utf8");

// List all render functions in GAS Scripts.html
const matches = content.match(/function render[A-Za-z0-9_]+\s*\(/g);
console.log("Functions found in Scripts.html:", matches);
