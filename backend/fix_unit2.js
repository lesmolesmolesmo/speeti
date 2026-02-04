const fs = require("fs");
const path = "/var/www/speeti/frontend/src/components/ProductModal.jsx";
let code = fs.readFileSync(path, "utf8");

// Fix the broken unitMap - strings need quotes
const broken = "const unitMap = {ml:ml,Liter:l,l:l,g:g,kg:kg,Stück:stück}";
const fixed = "const unitMap = {ml:ml,Liter:l,l:l,g:g,kg:kg,Stück:stück}";
code = code.replace(broken, fixed);

// Also fix the fallback
code = code.replace("|| stück}", "|| stück}");

fs.writeFileSync(path, code);
console.log("✅ Fixed quotes");
