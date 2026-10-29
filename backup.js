/* ProyectoBarX v42: recuperación reanudable con diagnóstico, reintentos y verificación. NO restauración total. */
const BackupManager = (() => {
  const COLLECTIONS=['users','categories','products','deletedProducts','deletedCategories','sales','expenses','deletedExpenses','expenseRevisions','movements','cashSessions','jornadas','cashMovements','cashLocks','audits'];
  const encoder=new TextEncoder();
  const BUDGET=5000; // máximo preventivo por día local, no indica cuota disponible
  let draft=null, imported=null, authorizedAt=0, busy=false;
  const status=(s,error=false)=>{const e=document.getElementById('backup-status');if(e){e.textContent=s;e.style.color=error?'#dc3545':'';}};
  const progress=(n,total,label)=>{const v=total?Math.floor(n*100/total):0;const e=document.getElementById('backup-progress');if(e){e.replaceChildren();e.textContent=`${label}: ${v}% (${n.toLocaleString('es-PE')}/${total.toLocaleString('es-PE')})`;const bar=document.createElement('div');bar.className='progress';bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuenow',String(v));bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');const inner=document.createElement('div');inner.className='progress-bar';inner.style.width=v+'%';bar.append(inner);e.append(bar);}};
  const assertAdmin=()=>{if(!Auth.isAdmin()||!fbAuth.currentUser||fbAuth.currentUser.uid!==Auth.currentUser()?.id)throw Error('Requiere una cuenta de administrador autenticada.');};
  const assertZip=()=>{if(typeof JSZip==='undefined')throw Error('No se ha cargado JSZip.');};
  const permit=()=>{assertAdmin();if(Date.now()-authorizedAt>10*60*1000)throw Error('La autorización caducó. Vuelve a verificar la contraseña.');};
  const clean=v=>{if(v&&typeof v.toDate==='function')return {__barxTimestamp:v.toDate().toISOString()};if(Array.isArray(v))return v.map(clean);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clean(x)]));return v;};
  const revive=v=>{if(Array.isArray(v))return v.map(revive);if(v&&typeof v==='object'){if(Object.keys(v).length===1&&typeof v.__barxTimestamp==='string')return firebase.firestore.Timestamp.fromDate(new Date(v.__barxTimestamp));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]));}return v;};
  const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const bytes=s=>encoder.encode(s).length;
  const fmt=n=>(n/1048576).toFixed(2)+' MiB';
  const progressKey=id=>'barx-v40-restore-'+firebaseConfig.projectId+'-'+fbAuth.currentUser.uid+'-'+id;
  async function listAll(){assertAdmin();const docs=[];for(const name of COLLECTIONS){let cursor=null;while(true){let query=db.collection(name).orderBy(firebase.firestore.FieldPath.documentId()).limit(200);if(cursor)query=query.startAfter(cursor);const page=await query.get({source:'server'});for(const d of page.docs)docs.push({collection:name,id:d.id,data:clean(d.data())});status('Preparando copia: '+name+' · '+docs.length+' documentos');if(page.size<200)break;cursor=page.docs[page.docs.length-1];}}return docs;}
  async function measure(){try{assertAdmin();if(busy)throw Error('Hay otra operación en curso.');busy=true;draft=null;const docs=await listAll(),payload=JSON.stringify(docs);draft={docs,payload,createdAt:new Date().toISOString()};renderInfo();status('Datos consultados. Descarga el ZIP antes de modificar información.');}catch(e){status('No se pudo calcular: '+e.message,true);}finally{busy=false;}}
  function renderInfo(){const e=document.getElementById('backup-estimate');if(e)e.textContent=draft?`${draft.docs.length.toLocaleString('es-PE')} documentos; ${fmt(bytes(draft.payload))} de JSON antes de comprimir. Se generará UN ZIP.`:'Primero calcula el tamaño de los datos desde Firestore.';}
  async function exportParts(){try{assertAdmin();assertZip();if(!draft)throw Error('Primero calcula el respaldo.');if(busy)throw Error('Operación en curso.');busy=true;const payload=draft.payload;const backupId='BARX-'+Date.now();const manifest={format:'barx-single-v2',backupId,projectId:firebaseConfig.projectId,createdAt:draft.createdAt,documentCount:draft.docs.length,sha256:await hash(payload),collections:COLLECTIONS};const zip=new JSZip();zip.file('manifest.json',JSON.stringify(manifest,null,2));zip.file('documents.json',payload);status('Comprimiendo ZIP único...');const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=backupId+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Descarga iniciada: '+fmt(blob.size)+'. Comprueba que se guardó el archivo; la copia no incluye Authentication, reglas ni índices.');draft=null;renderInfo();}catch(e){status('Error: '+e.message,true);}finally{busy=false;}}
  async function access(){try{assertAdmin();const input=document.getElementById('backup-password');const user=fbAuth.currentUser;if(!user.email)throw Error('Necesitas una cuenta Firebase con correo y contraseña.');if(!input?.value)throw Error('Introduce la contraseña.');await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email,input.value));input.value='';authorizedAt=Date.now();document.getElementById('backup-import-panel').hidden=false;status('Identidad verificada. Selecciona el ZIP.');}catch(e){status('Acceso denegado: '+e.message,true);}}
  async function addPart(input){try{permit();assertZip();const file=input?.files?.[0];if(!file)return;if(busy)throw Error('Operación en curso.');busy=true;const zip=await JSZip.loadAsync(file);if(!zip.file('manifest.json')||!zip.file('documents.json'))throw Error('ZIP no reconocido.');const manifest=JSON.parse(await zip.file('manifest.json').async('text'));if(manifest.format!=='barx-single-v2'||manifest.projectId!==firebaseConfig.projectId)throw Error('Formato o proyecto Firebase incorrecto.');const payload=await zip.file('documents.json').async('text');if(await hash(payload)!==manifest.sha256)throw Error('La copia no supera la verificación SHA-256.');const docs=JSON.parse(payload);if(!Array.isArray(docs)||docs.length!==manifest.documentCount)throw Error('Cantidad de documentos inválida.');const seen=new Set();for(const d of docs){if(!d||!COLLECTIONS.includes(d.collection)||typeof d.id!=='string'||!d.id||d.id.includes('/')||!d.data||typeof d.data!=='object'||Array.isArray(d.data))throw Error('Documento inválido.');const key=d.collection+'/'+d.id;if(seen.has(key))throw Error('Documento duplicado: '+key);seen.add(key);}imported={manifest,docs};const saved=JSON.parse(localStorage.getItem(progressKey(manifest.backupId))||'null');const index=saved?.hash===manifest.sha256?Math.min(saved.index||0,docs.length):0;document.getElementById('backup-restore-controls').hidden=false;document.getElementById('backup-restore-summary').textContent=`${docs.length} documentos válidos. ${index} ya procesados en una sesión anterior. Se omitirán existentes; NO se sobrescribe la base completa.`;progress(index,docs.length,'Listo para recuperar');status('ZIP validado. Comprueba los datos antes de continuar.');}catch(e){status('No se pudo importar: '+e.message,true);}finally{busy=false;if(input)input.value='';}}
  function pacificDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const codeOf=e=>String(e?.code||'').replace(/^firestore\//,'').toLowerCase();
  const isTransient=e=>['unavailable','deadline-exceeded','aborted','internal','unknown'].includes(codeOf(e)) || /network|transport|connection|quic|timeout/i.test(String(e?.message||''));
  const details=(e,d)=>`${d.collection}/${d.id} — ${e?.code||'sin-código'}: ${e?.message||String(e)}`;
  async function serverGet(ref){return ref.get({source:'server'});}
  async function withRetry(operation,d){let error;for(let attempt=0;attempt<4;attempt++){try{return await operation();}catch(e){error=e;if(!isTransient(e)||attempt===3)break;status(`Problema temporal en ${d.collection}/${d.id}. Reintento ${attempt+1}/3: ${e.code||e.message}` ,true);await sleep(Math.min(8000,650*2**attempt)+Math.floor(Math.random()*200));}}throw error;}
  // Escritos con ID fijo: repetir un set con los mismos datos no crea documentos duplicados.
  // Solo se avanza tras confirmar el estado del servidor. Ante respuesta ambigua,
  // el reintento empieza por leer el documento antes de volver a escribirlo.
  async function restoreOne(d){const ref=db.collection(d.collection).doc(d.id);const current=await withRetry(()=>serverGet(ref),d);if(current.exists)return 'existing';
    try{await withRetry(()=>ref.set(revive(d.data)),d);}catch(e){
      // La escritura pudo haberse completado en el servidor y perderse la respuesta.
      const check=await withRetry(()=>serverGet(ref),d);
      if(!check.exists)throw e;
    }
    const verified=await withRetry(()=>serverGet(ref),d);
    if(!verified.exists)throw Error('No se pudo confirmar la escritura en Firestore.');
    return 'created';
  }
  async function ensureRestoreGrant(backupId){
    permit();
    // La sesión solo habilita CREAR documentos faltantes en colecciones históricas.
    // No sustituye permisos de lectura, ni permite sobrescribir documentos.
    const ref=db.collection('restoreGrants').doc(fbAuth.currentUser.uid);
    await ref.set({ownerUid:fbAuth.currentUser.uid,backupId,
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt:firebase.firestore.Timestamp.fromMillis(Date.now()+8*60*1000)});
  }
  async function restoreMissing(){
    let stoppedReason=null;
    try{
      permit();if(!imported)throw Error('Importa el ZIP primero.');if(busy)throw Error('Ya existe una restauración activa.');
      if(!confirm('¿Recuperar SOLO los documentos faltantes? Detén previamente las ventas y crea un respaldo actual. No es una restauración total.'))return;
      busy=true;const {docs,manifest}=imported;await ensureRestoreGrant(manifest.backupId);const key=progressKey(manifest.backupId);
      let checkpoint=JSON.parse(localStorage.getItem(key)||'null');
      if(!checkpoint||checkpoint.hash!==manifest.sha256)checkpoint={hash:manifest.sha256,index:0,day:pacificDay(),attempts:0};
      if(checkpoint.day!==pacificDay()){checkpoint.day=pacificDay();checkpoint.attempts=0;}
      checkpoint.lastError=null;
      let created=0,already=0;
      while(checkpoint.index<docs.length){
        try{permit();}catch(e){stoppedReason='Autorización: '+e.message;break;}
        if(checkpoint.day!==pacificDay()){checkpoint.day=pacificDay();checkpoint.attempts=0;}
        if(checkpoint.attempts>=BUDGET){stoppedReason='Presupuesto preventivo diario de '+BUDGET+' documentos alcanzado. Puedes continuar cuando se renueve el día del Pacífico.';break;}
        if(Date.now()-authorizedAt>7*60*1000){stoppedReason='La autorización temporal está por vencer. Vuelve a introducir la contraseña y continúa.';break;}
        const d=docs[checkpoint.index];
        try{
          const outcome=await restoreOne(d);
          if(outcome==='created')created++;else already++;
          checkpoint.index++;checkpoint.attempts++;
          checkpoint.lastError=null;
          localStorage.setItem(key,JSON.stringify(checkpoint));
        }catch(e){
          stoppedReason=details(e,d);
          checkpoint.lastError={collection:d.collection,id:d.id,code:e?.code||'unknown',message:String(e?.message||e),at:new Date().toISOString()};
          localStorage.setItem(key,JSON.stringify(checkpoint));
          break;
        }
        if(checkpoint.index%5===0||checkpoint.index===docs.length)progress(checkpoint.index,docs.length,'Restauración');
      }
      progress(checkpoint.index,docs.length,'Restauración');
      if(checkpoint.index===docs.length){
        status(`Procesamiento terminado: ${created} recuperados y confirmados en esta ejecución, ${already} ya existentes. Verifica relaciones y registros antes de considerarlo restauración completa.`);
        localStorage.removeItem(key);
        try{await db.collection('restoreGrants').doc(fbAuth.currentUser.uid).delete();}catch(e){console.warn('No se pudo revocar la autorización temporal; caduca automáticamente.',e);}
      }else{
        status(`PAUSADA en ${checkpoint.index}/${docs.length}. CAUSA: ${stoppedReason||'no identificada'}. Archivo y progreso preservados; vuelve a identificarte, importa el mismo ZIP y continúa.`,true);
      }
    }catch(e){status('No se pudo continuar: '+(e.code||'')+' '+e.message,true);}
    finally{busy=false;}
  }
  function resetImport(){if(busy)return;imported=null;authorizedAt=0;const e=document.getElementById('backup-import-panel');if(e)e.hidden=true;const c=document.getElementById('backup-restore-controls');if(c)c.hidden=true;status('Sesión de importación cerrada. Los checkpoints locales no se eliminan.');}
  return {measure,renderInfo,exportParts,access,addPart,restoreMissing,resetImport};
})();
