const fs=require('fs'),assert=require('assert'),p=require('path');
const root=p.resolve(__dirname,'..');const read=n=>fs.readFileSync(p.join(root,n),'utf8');
const backup=read('backup.js'),pages=read('pages.js');
for(const [name,condition] of [
 ['un ZIP',backup.includes("format:'barx-single-v2'")],
 ['comprobación hash',backup.includes('manifest.sha256')],
 ['cursor persistente',backup.includes('localStorage.setItem(key')],
 ['presupuesto preventivo',backup.includes('BUDGET=5000')],
 ['contraseña Firebase',backup.includes('reauthenticateWithCredential')],
 ['buscador por categoría',pages.includes('Store.getCategory(p.categoriaId)?.nombre')],
 ['búsqueda conservada en carrito',pages.includes('previousSearch')],
 ['nueva caché',read('sw.js').includes('proyecto-x-v40')]
]){assert.ok(condition,name);console.log('PASS '+name)}
