const fs = require("fs");
const path = "/var/www/speeti/backend/server.js";
let code = fs.readFileSync(path, "utf8");

// Add unit_type to fields array (both POST and PUT)
const oldFields = "storage_temp, nutrition_info, visible, in_stock, sort_order]";
const newFields = "storage_temp, nutrition_info, visible, in_stock, sort_order, unit_type]";
code = code.split(oldFields).join(newFields);

console.log("Updated fields arrays");
fs.writeFileSync(path, code);
