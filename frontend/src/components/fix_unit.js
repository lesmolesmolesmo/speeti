const fs = require("fs");
let code = fs.readFileSync("ProductModal.jsx", "utf8");

// Replace unit select onChange
const old = "onChange={(e) => setForm({...form, unit: e.target.value})}";
const neu = `onChange={(e) => { 
  const unitMap = {ml:"ml",Liter:"l",l:"l",g:"g",kg:"kg","Stück":"stück"}; 
  setForm({...form, unit: e.target.value, unit_type: unitMap[e.target.value] || "stück"}); 
}}`;

code = code.replace(old, neu);
fs.writeFileSync("ProductModal.jsx", code);
console.log("Done!");
