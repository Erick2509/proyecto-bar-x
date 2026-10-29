const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const store=fs.readFileSync(path.join(root,'store.js'),'utf8');
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.js'))){cp.execFileSync('node',['--check',path.join(root,name)]);}
const checks=[
 ['lectura servidor',store.includes("source.get({source:'server'})")],
 ['consulta estricta al cerrar caja',store.includes('serverOnly:force')],
 ['deduplicación de descargas',store.includes('pendingFetches.has(pendingKey)')],
 ['propagación de errores por fecha',store.includes('if(!result.ok)return result;')],
 ['bloqueo de caja validado',store.includes("lockSnap.data().estado!=='Abierta'")],
 ['archivo de gastos editados',store.includes("collection('expenseRevisions')")],
 ['archivo de gastos eliminados',store.includes("collection('deletedExpenses')")],
 ['versión caché',fs.readFileSync(path.join(root,'sw.js'),'utf8').includes('proyecto-x-v40')]
];
for(const [name,ok] of checks){assert.ok(ok,name);process.stdout.write('PASS '+name+'\n');}
console.log('PASS sintaxis de JavaScript');
