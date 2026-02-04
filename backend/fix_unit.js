const fs = require("fs");
const path = "/var/www/speeti/frontend/src/components/ProductModal.jsx";
let code = fs.readFileSync(path, "utf8");

// Replace unit select onChange to also set unit_type
const old = "onChange={(e) => setForm({...form, unit: e.target.value})}";
const neu = "onChange={(e) => { const unitMap = {ml:ml,Liter:l,l:l,g:g,kg:kg,Stück:stück}; setForm({...form, unit: e.target.value, unit_type: unitMap[e.target.value] || stück}); }}";

if (code.includes(old)) {
  code = code.replace(old, neu);
  fs.writeFileSync(path, code);
  console.log("✅ Updated unit select to also set unit_type");
} else {
  console.log("Pattern not found");
}
