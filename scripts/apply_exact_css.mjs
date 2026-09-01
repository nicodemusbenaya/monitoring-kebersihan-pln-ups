import { execSync } from "child_process";
import fs from "fs";

// Get exact Styles.html from git branch google-script
const rawStyles = execSync("git show google-script:Styles.html", { encoding: "utf8" });

// Remove <style> and </style>
const cleanedCss = rawStyles.replace(/<style[^>]*>/i, "").replace(/<\/style>/i, "").trim();

// Combine Tailwind directives + the entire exact CSS stylesheet from GAS
const fullCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

${cleanedCss}
`;

fs.writeFileSync("./src/app/globals.css", fullCss, "utf8");
console.log("src/app/globals.css successfully updated with 100% exact CSS from google-script!");
