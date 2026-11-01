const assert=require('assert'),fs=require('fs');
const pages=fs.readFileSync(__dirname+'/../pages.js','utf8'),store=fs.readFileSync(__dirname+'/../store.js','utf8'),rules=fs.readFileSync(__dirname+'/../firestore.rules','utf8');
for(const v of ['sale-discount-type','sale-discount-value','sale-discount-summary','readSaleDiscount','updateSaleDiscount','descuentoMonto','Descuento (S/)'])assert(pages.includes(v),v);
for(const v of ['subtotal','descuentoTipo','descuentoValor','descuentoMonto','total=+(subtotal-descuentoMonto).toFixed(2)','descuentoMonto/subtotal>0.2000001'])assert(store.includes(v),v);
for(const v of ['request.resource.data.descuentoMonto','request.resource.data.subtotal','admin()'])assert(rules.includes(v),v);
function calc(subtotal,type,value){const amt=+(type==='percent'?subtotal*value/100:value).toFixed(2);return +(subtotal-amt).toFixed(2)}
assert.equal(calc(100,'amount',10),90);assert.equal(calc(100,'percent',15),85);assert.equal(calc(9.99,'percent',10),8.99);assert.equal(calc(100,'percent',0),100);
console.log('v47 static discount checks passed');
