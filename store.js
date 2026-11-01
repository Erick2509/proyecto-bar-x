/* ===== FIREBASE STORE ===== */
const Store = (() => {
  const state = { users:[], categories:[], products:[], sales:[], movements:[], expenses:[], cashSessions:[], jornadas:[], cashMovements:[], audits:[], currentUser:null, cart:[] };
  const refs = {};
  const mutationLocks = new Set();
  async function guarded(key, fn){ if(mutationLocks.has(key)) return {ok:false,error:'Esta operación ya se está procesando'}; mutationLocks.add(key); try{return await fn();}finally{mutationLocks.delete(key);} }
  const limaParts = () => {
    const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date());
    const x=Object.fromEntries(parts.map(p=>[p.type,p.value])); return {fecha:`${x.year}-${x.month}-${x.day}`,hora:`${x.hour}:${x.minute}:${x.second}`};
  };
  const clean = o => JSON.parse(JSON.stringify(o));
  const docId = () => db.collection('_ids').doc().id;
  const isActive = u => String(u?.estado || '').toLowerCase() === 'activo';
  const normalizeUser = u => ({
    ...u,
    nombres: String(u?.nombres || u?.nombre || '').trim(),
    apellidos: String(u?.apellidos || u?.apellido || '').trim(),
    estado: isActive(u) ? 'Activo' : (u?.estado || 'Inactivo')
  });
  function getCategory(id){return state.categories.find(x=>x.id===id)}
  function getProduct(id){return state.products.find(x=>x.id===id)}
  function getUser(id){return state.users.find(x=>x.id===id)}
  function stockStatus(p){return p.stock<=0?'agotado':p.stock<=p.stockMinimo?'bajo':'normal'}
  function lowStockProducts(){return state.products.filter(p=>p.estado==='Activo'&&p.stock<=p.stockMinimo)}
  // ===== OPTIMIZACIÓN FIRESTORE v30 =====
  // Solo mantenemos listeners en datos que realmente necesitan tiempo real. Los historiales
  // se consultan bajo demanda y con límites para evitar descargar toda la base en cada inicio.
  const loadedAt = {};
  // Evita consultas duplicadas cuando dos pantallas requieren el mismo rango.
  const pendingFetches = new Map();
  let coreLoadedFor = null;
  let liveBusinessDate = null;
  // v30: se retiró el monitor local anterior. trackUsage queda como no-op por compatibilidad interna.
  function usageDate(){ return limaParts().fecha; }
  function trackUsage(){ /* intencionalmente vacío */ }
  function normalizeDocs(name,snap){ return snap.docs.map(d=>name==='users'?normalizeUser({id:d.id,...d.data()}):({id:d.id,...d.data()})); }
  function replaceState(name,docs){ state[name]=docs; }
  function mergeState(name,docs){ const m=new Map(state[name].map(x=>[x.id,x])); docs.forEach(x=>m.set(x.id,x)); state[name]=[...m.values()]; }
  function listenScoped(key,name,source,{replace=false,predicate=null}={}){
    refs[key]?.();
    return new Promise(resolve=>{
      let first=true;
      refs[key]=source.onSnapshot(snap=>{
        const docs=normalizeDocs(name,snap);
        // En el primer snapshot se cobra por cada documento devuelto; después, por cada cambio.
        const readCount=first?Math.max(1,snap.size):snap.docChanges().length; trackUsage('reads',readCount, first?docs:snap.docChanges().map(c=>({id:c.doc.id,...c.doc.data()})));
        if(replace)replaceState(name,docs);
        else if(predicate){ state[name]=state[name].filter(x=>!predicate(x)); mergeState(name,docs); }
        else mergeState(name,docs);
        first=false; resolve();
        if(Auth?.isLoggedIn?.() && Router?.current) App?.requestRefresh?.();
      },err=>{ console.error('Firestore '+name+':',err); try{Toast.show('Error cargando '+name+': '+(err.message||err),'error')}catch(_){} resolve(); });
    });
  }
  async function fetchInto(name,source,{replace=false,cacheKey=null,ttl=300000,predicate=null,serverOnly=false}={}){
    const key=cacheKey||name,now=Date.now();
    if(!serverOnly && loadedAt[key] && now-loadedAt[key]<ttl) return {ok:true,cached:true};
    const pendingKey=key+(serverOnly?':server':'');
    if(pendingFetches.has(pendingKey))return pendingFetches.get(pendingKey);
    const request=(async()=>{
      try{
        // El cierre exige datos confirmados por Firestore, no resultados de caché offline.
        const snap=await (serverOnly?source.get({source:'server'}):source.get());
        const docs=normalizeDocs(name,snap);trackUsage('reads',Math.max(1,snap.size),docs);
        if(replace)replaceState(name,docs);
        else if(predicate){state[name]=state[name].filter(x=>!predicate(x));mergeState(name,docs);}
        else mergeState(name,docs);
        loadedAt[key]=Date.now();return{ok:true,count:docs.length};
      }catch(e){console.error('Carga '+name,e);return{ok:false,error:e.message};}
    })();
    pendingFetches.set(pendingKey,request);
    try{return await request;}finally{if(pendingFetches.get(pendingKey)===request)pendingFetches.delete(pendingKey);}
  }
  function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(d); }
  function monthStart(){ return usageDate().slice(0,7)+'-01'; }
  function validDateRange(desde,hasta){
    desde=String(desde||''); hasta=String(hasta||'');
    return /^\d{4}-\d{2}-\d{2}$/.test(desde) && /^\d{4}-\d{2}-\d{2}$/.test(hasta) && desde<=hasta;
  }
  function datesInRange(desde,hasta,maxDays=366){
    if(!validDateRange(desde,hasta))return[];
    const out=[], start=new Date(desde+'T12:00:00Z'), end=new Date(hasta+'T12:00:00Z'), d=new Date(start);
    for(;d<=end && out.length<maxDays;d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));
    return d<=end?[]:out;
  }
  function getSalePayments(sale){
    const allowed=['Efectivo','Yape','Plin','Tarjeta'];
    const pagos=Array.isArray(sale?.pagos)?sale.pagos
      .map(p=>({metodo:String(p?.metodo||''),monto:+Number(p?.monto||0).toFixed(2)}))
      .filter(p=>allowed.includes(p.metodo)&&Number.isFinite(p.monto)&&p.monto>0):[];
    if(pagos.length)return pagos;
    const metodo=String(sale?.metodoPago||'');
    const total=+Number(sale?.total||0).toFixed(2);
    return allowed.includes(metodo)&&total>0?[{metodo,monto:total}]:[];
  }
  function paymentTotals(sales){
    const out={Efectivo:0,Yape:0,Plin:0,Tarjeta:0};
    (sales||[]).forEach(s=>getSalePayments(s).forEach(p=>{out[p.metodo]=+(out[p.metodo]+Number(p.monto||0)).toFixed(2)}));
    return out;
  }
  function salePaymentLabel(sale){
    const pagos=getSalePayments(sale);
    if(!pagos.length)return String(sale?.metodoPago||'—');
    if(pagos.length===1)return pagos[0].metodo;
    return pagos.map(p=>`${p.metodo} S/${Number(p.monto||0).toFixed(2)}`).join(' + ');
  }

  // ===== JORNADAS v35 =====
  // Una jornada representa el turno operativo del bar. Puede iniciar un día y terminar
  // al siguiente sin cortar ventas a medianoche. Por compatibilidad, usamos el mismo
  // id para la jornada y su caja principal (jornadaId === cajaId).
  function getOpenJourney(userId=state.currentUser?.id){
    return state.jornadas.find(j=>j.usuarioId===userId&&j.estado==='Abierta')||null;
  }
  function getOpenCash(userId=state.currentUser?.id){
    return state.cashSessions.find(c=>c.usuarioId===userId&&c.estado==='Abierta')||null;
  }
  function journeyIdForCurrent(){
    const j=getOpenJourney();
    if(j?.id)return j.id;
    const c=getOpenCash();
    return c?.id||null;
  }
  function journeyDurationMinutes(j, endParts=null){
    if(!j)return 0;
    const fd=String(j.fechaApertura||j.fecha||'').trim();
    const ht=String(j.horaApertura||j.hora||'00:00:00').trim();
    const ed=String(endParts?.fecha||j.fechaCierre||limaParts().fecha).trim();
    const et=String(endParts?.hora||j.horaCierre||limaParts().hora).trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fd)||!/^\d{2}:\d{2}/.test(ht)||!/^\d{4}-\d{2}-\d{2}$/.test(ed)||!/^\d{2}:\d{2}/.test(et))return 0;
    const start=Date.parse(`${fd}T${ht.slice(0,8)}-05:00`);
    const end=Date.parse(`${ed}T${et.slice(0,8)}-05:00`);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return 0;
    return Math.floor((end-start)/60000);
  }
  function journeyNumber(id){ return `JOR-${String(id||'').slice(0,6).toUpperCase()}`; }

  async function ensureJourneyForOpenCash(cash){
    if(!cash?.id||cash.estado!=='Abierta')return null;
    const existing=state.jornadas.find(j=>j.id===cash.id);
    if(existing)return existing;
    try{
      const ref=db.collection('jornadas').doc(cash.id);
      const snap=await ref.get(); trackUsage('reads',1);
      if(snap.exists){
        const j={id:snap.id,...snap.data()}; mergeState('jornadas',[j]); return j;
      }
      const payload={
        numero:journeyNumber(cash.id),
        fechaApertura:cash.fecha,
        horaApertura:cash.hora,
        usuarioId:cash.usuarioId,
        usuarioNombre:cash.usuarioNombre||'',
        cajaId:cash.id,
        montoInicial:Number(cash.montoInicial||0),
        estado:'Abierta',
        migradaDesdeCaja:true,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      await ref.set(payload); trackUsage('writes',1);
      const local={id:cash.id,...payload}; if(!state.jornadas.some(x=>x.id===cash.id))state.jornadas.push(local);
      return local;
    }catch(e){
      console.warn('No se pudo vincular la caja antigua a una jornada:',e);
      return null;
    }
  }
  async function bindDailyListeners(force=false){
    const u=state.currentUser, d=usageDate(); if(!u)return{ok:false,error:'Sesión no válida'};
    if(!force && liveBusinessDate===d && refs.todaySales)return{ok:true,changed:false,date:d};
    const previous=liveBusinessDate;
    liveBusinessDate=d;
    const saleQuery=u.role==='admin'?db.collection('sales').where('fecha','==',d):db.collection('sales').where('empleadoId','==',u.id).where('fecha','==',d);
    const tasks=[listenScoped('todaySales','sales',saleQuery,{predicate:x=>x.fecha===d&&(u.role==='admin'||x.empleadoId===u.id)})];
    if(u.role==='admin') tasks.push(listenScoped('todayExpenses','expenses',db.collection('expenses').where('fecha','==',d),{predicate:x=>x.fecha===d}));
    await Promise.all(tasks);
    return{ok:true,changed:!!previous&&previous!==d,date:d};
  }
  async function refreshDailyContext(){ return bindDailyListeners(false); }
  async function loadData(){
    const u=state.currentUser; if(!u)return;
    const alreadyCore=coreLoadedFor===u.id && refs.productsLive && refs.openCash;
    if(!alreadyCore){
      coreLoadedFor=u.id;
      // Categorías cambian poco: una sola lectura por sesión, sin listener permanente.
      const cats=fetchInto('categories',db.collection('categories'),{replace:true,cacheKey:'categories',ttl:1800000});
      // Stock sí necesita tiempo real para evitar vender con una pantalla desactualizada.
      const products=listenScoped('productsLive','products',db.collection('products'),{replace:true});
      // Una caja abierta no depende de la fecha: puede continuar durante la madrugada o varios días.
      const cashQuery=db.collection('cashSessions').where('usuarioId','==',u.id).where('estado','==','Abierta');
      const cash=listenScoped('openCash','cashSessions',cashQuery,{predicate:x=>x.usuarioId===u.id&&x.estado==='Abierta'});
      const journeyQuery=db.collection('jornadas').where('usuarioId','==',u.id).where('estado','==','Abierta');
      const journey=listenScoped('openJourney','jornadas',journeyQuery,{predicate:x=>x.usuarioId===u.id&&x.estado==='Abierta'});
      await Promise.all([cats,products,cash,journey]);
      const legacyOpen=getOpenCash(u.id);
      if(legacyOpen&&!getOpenJourney(u.id))await ensureJourneyForOpenCash(legacyOpen);
    }
    await bindDailyListeners(!refs.todaySales);
  }
  async function loadUsers(){ return fetchInto('users',db.collection('users'),{replace:true,cacheKey:'users',ttl:900000}); }
  async function loadSalesHistory(){
    const u=state.currentUser; if(!u)return; const start=daysAgo(30);
    if(u.role==='admin') return fetchInto('sales',db.collection('sales').where('fecha','>=',start).orderBy('fecha','desc'),{cacheKey:'salesHistory',ttl:300000});
    // Para empleados consultamos 31 días por fecha exacta para mantener compatibilidad con reglas e índices simples.
    if(loadedAt.salesHistory && Date.now()-loadedAt.salesHistory<300000)return{ok:true,cached:true};
    for(let i=0;i<=30;i++){ const date=daysAgo(i); await fetchInto('sales',db.collection('sales').where('empleadoId','==',u.id).where('fecha','==',date),{cacheKey:'empSales:'+date,ttl:300000}); }
    loadedAt.salesHistory=Date.now(); return{ok:true};
  }
  async function loadSalesForDate(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return{ok:false,error:'Fecha inválida'};
    const u=state.currentUser; let q=db.collection('sales').where('fecha','==',date); if(u?.role!=='admin')q=q.where('empleadoId','==',u.id);
    return fetchInto('sales',q,{cacheKey:'salesDate:'+date,ttl:600000});
  }
  async function loadSalesForRange(desde,hasta){
    if(!validDateRange(desde,hasta))return{ok:false,error:'Rango de fechas inválido'};
    const u=state.currentUser;if(!u)return{ok:false,error:'Sesión no válida'};
    if(u.role==='admin'){
      return fetchInto('sales',db.collection('sales').where('fecha','>=',desde).where('fecha','<=',hasta).orderBy('fecha','desc'),{cacheKey:`salesRange:${desde}:${hasta}`,ttl:300000});
    }
    const dates=datesInRange(desde,hasta,366);
    if(!dates.length)return{ok:false,error:'El rango solicitado es demasiado amplio'};
    for(const date of dates){
      const result=await fetchInto('sales',db.collection('sales').where('empleadoId','==',u.id).where('fecha','==',date),{cacheKey:'empSales:'+date,ttl:300000});
      if(!result.ok)return result;
    }
    return{ok:true};
  }
  async function loadSalesForCash(cashId,{force=false}={}){
    cashId=String(cashId||'').trim();
    const u=state.currentUser;if(!u||!cashId)return{ok:false,error:'Caja inválida'};
    let q=db.collection('sales').where('empleadoId','==',u.id).where('cajaId','==',cashId);
    return fetchInto('sales',q,{cacheKey:`cashSales:${cashId}`,ttl:force?0:120000,serverOnly:force,predicate:x=>x.empleadoId===u.id&&x.cajaId===cashId});
  }
  async function loadExpensesHistory(){ return fetchInto('expenses',db.collection('expenses').where('fecha','>=',daysAgo(30)).orderBy('fecha','desc'),{cacheKey:'expensesHistory',ttl:300000}); }
  async function loadExpensesForRange(desde,hasta){
    if(!validDateRange(desde,hasta))return{ok:false,error:'Rango de fechas inválido'};
    return fetchInto('expenses',db.collection('expenses').where('fecha','>=',desde).where('fecha','<=',hasta).orderBy('fecha','desc'),{cacheKey:`expensesRange:${desde}:${hasta}`,ttl:300000});
  }
  async function loadMovements(){ return fetchInto('movements',db.collection('movements').where('fecha','>=',daysAgo(30)).orderBy('fecha','desc'),{cacheKey:'movements',ttl:300000}); }
  async function loadMovementsForRange(desde,hasta){
    if(!validDateRange(desde,hasta))return{ok:false,error:'Rango de fechas inválido'};
    return fetchInto('movements',db.collection('movements').where('fecha','>=',desde).where('fecha','<=',hasta).orderBy('fecha','desc'),{cacheKey:`movementsRange:${desde}:${hasta}`,ttl:300000});
  }
  async function loadCashHistory(){
    const u=state.currentUser; if(!u)return;
    if(u.role==='admin') return fetchInto('cashSessions',db.collection('cashSessions').where('fecha','>=',daysAgo(45)).orderBy('fecha','desc').limit(80),{cacheKey:'cashHistory',ttl:300000});
    if(loadedAt.cashHistory && Date.now()-loadedAt.cashHistory<300000)return{ok:true,cached:true};
    for(let i=0;i<14;i++){const date=daysAgo(i);await fetchInto('cashSessions',db.collection('cashSessions').where('usuarioId','==',u.id).where('fecha','==',date),{cacheKey:'cash:'+date,ttl:300000});}
    loadedAt.cashHistory=Date.now(); return{ok:true};
  }
  function mergeLegacyCashAsJourneys(){
    const existing=new Set(state.jornadas.map(j=>j.id));
    const legacy=state.cashSessions.filter(c=>!existing.has(c.id)).map(c=>({
      id:c.id,
      numero:journeyNumber(c.id),
      fechaApertura:c.fecha,
      horaApertura:c.hora,
      fechaCierre:c.fechaCierre||null,
      horaCierre:c.horaCierre||null,
      usuarioId:c.usuarioId,
      usuarioNombre:c.usuarioNombre||'',
      cajaId:c.id,
      montoInicial:Number(c.montoInicial||0),
      estado:c.estado||'Cerrada',
      totalVentas:c.totalVentasDia==null?null:Number(c.totalVentasDia||0),
      cantidadVentas:c.cantidadVentasDia==null?null:Number(c.cantidadVentasDia||0),
      efectivoVentas:c.efectivoVentas==null?null:Number(c.efectivoVentas||0),
      yapeVentas:c.yapeVentas==null?null:Number(c.yapeVentas||0),
      plinVentas:c.plinVentas==null?null:Number(c.plinVentas||0),
      tarjetaVentas:c.tarjetaVentas==null?null:Number(c.tarjetaVentas||0),
      efectivoEsperado:c.esperado==null?null:Number(c.esperado||0),
      efectivoReal:c.real==null?null:Number(c.real||0),
      diferencia:c.diferencia==null?null:Number(c.diferencia||0),
      totalGastos:0,ingresosEfectivo:Number(c.ingresosEfectivo||0),retirosEfectivo:Number(c.retirosEfectivo||0),gastosEfectivo:Number(c.gastosEfectivo||0),
      duracionMinutos:null,
      legacy:true
    }));
    mergeState('jornadas',legacy);
    return legacy.length;
  }
  async function loadJourneyHistory(){
    const u=state.currentUser;if(!u)return{ok:false,error:'Sesión no válida'};
    if(u.role==='admin'){
      return fetchInto('jornadas',db.collection('jornadas').where('fechaApertura','>=',daysAgo(60)).orderBy('fechaApertura','desc').limit(120),{cacheKey:'journeyHistory',ttl:180000});
    }
    if(loadedAt.journeyHistory && Date.now()-loadedAt.journeyHistory<180000)return{ok:true,cached:true};
    for(let i=0;i<30;i++){
      const date=daysAgo(i);
      await fetchInto('jornadas',db.collection('jornadas').where('usuarioId','==',u.id).where('fechaApertura','==',date),{cacheKey:'journey:'+date,ttl:300000});
    }
    loadedAt.journeyHistory=Date.now();return{ok:true};
  }
  async function loadExpensesForJourney(jornadaId,{force=false}={}){
    jornadaId=String(jornadaId||'').trim();if(!jornadaId)return{ok:false,error:'Jornada inválida'};
    const key='expensesJourney:'+jornadaId;
    if(force)delete loadedAt[key];
    return fetchInto('expenses',db.collection('expenses').where('jornadaId','==',jornadaId),{cacheKey:key,ttl:force?0:300000,serverOnly:force,predicate:x=>x.jornadaId===jornadaId||x.cajaId===jornadaId});
  }
  async function loadMovementsForJourney(jornadaId,{force=false}={}){
    jornadaId=String(jornadaId||'').trim();if(!jornadaId)return{ok:false,error:'Jornada inválida'};
    const key='movementsJourney:'+jornadaId;
    if(force)delete loadedAt[key];
    return fetchInto('movements',db.collection('movements').where('jornadaId','==',jornadaId),{cacheKey:key,ttl:force?0:300000});
  }
  async function loadCashMovementsForJourney(jornadaId,{force=false}={}){
    jornadaId=String(jornadaId||'').trim();if(!jornadaId)return{ok:false,error:'Jornada inválida'};
    const key='cashMovementsJourney:'+jornadaId;
    if(force)delete loadedAt[key];
    return fetchInto('cashMovements',db.collection('cashMovements').where('jornadaId','==',jornadaId),{cacheKey:key,ttl:force?0:300000,serverOnly:force,predicate:x=>x.jornadaId===jornadaId||x.cajaId===jornadaId});
  }
  async function loadJourneyDetail(jornadaId,{force=false}={}){
    jornadaId=String(jornadaId||'').trim();const u=state.currentUser;
    if(!u||!jornadaId)return{ok:false,error:'Jornada inválida'};
    const tasks=[];
    if(u.role==='admin'){
      const key='journeySalesAdmin:'+jornadaId;if(force)delete loadedAt[key];
      tasks.push(fetchInto('sales',db.collection('sales').where('cajaId','==',jornadaId),{cacheKey:key,ttl:force?0:180000}));
      tasks.push(loadExpensesForJourney(jornadaId,{force}));
    }else{
      tasks.push(loadSalesForCash(jornadaId,{force}));
    }
    tasks.push(loadCashMovementsForJourney(jornadaId,{force}));
    const results=await Promise.all(tasks);
    const bad=results.find(r=>r&&!r.ok);
    return bad||{ok:true};
  }
  async function preparePage(page){
    if(!state.currentUser)return;
    await refreshDailyContext();
    if(['empleados','movimientos','gastos'].includes(page))await loadUsers();
    if(page==='empleados')return;
    if(page==='movimientos')await loadMovements();
    if(page==='gastos')await loadExpensesHistory();
    if(page==='historial')await Promise.all([loadSalesHistory(),loadJourneyHistory(), state.currentUser.role==='admin'?loadUsers():Promise.resolve()]);
    if(page==='dashboard'||page==='inicio'){
      const open=getOpenCash(state.currentUser.id);
      if(open)await Promise.all([loadSalesForCash(open.id),loadCashMovementsForJourney(open.id),state.currentUser.role==='admin'?loadExpensesForJourney(open.id):Promise.resolve({ok:true})]);
    }
    if(page==='caja'){
      await Promise.all([loadCashHistory(),loadJourneyHistory()]);
      mergeLegacyCashAsJourneys();
      const open=getOpenCash(state.currentUser.id);
      if(open){
        await ensureJourneyForOpenCash(open);
        await Promise.all([loadSalesForCash(open.id),loadCashMovementsForJourney(open.id),state.currentUser.role==='admin'?loadExpensesForJourney(open.id):Promise.resolve({ok:true})]);
      }
    }
    if(page==='jornadas'){
      await Promise.all([loadJourneyHistory(),loadCashHistory(), state.currentUser.role==='admin'?loadUsers():Promise.resolve()]);
      mergeLegacyCashAsJourneys();
      const open=getOpenCash(state.currentUser.id);
      if(open)await Promise.all([loadSalesForCash(open.id),loadCashMovementsForJourney(open.id),state.currentUser.role==='admin'?Promise.all([loadExpensesForJourney(open.id),loadMovementsForJourney(open.id)]):Promise.resolve({ok:true})]);
    }
    if(page==='gastos'||page==='movimientos')await loadJourneyHistory();
    if(page==='reportes')await Promise.all([loadSalesHistory(),loadExpensesHistory(),loadJourneyHistory()]);
  }
  let profilePromise=null, profileUid=null;
  async function loadProfile(uid){
    if(state.currentUser?.id===uid)return state.currentUser;
    if(profilePromise&&profileUid===uid)return profilePromise;
    profileUid=uid;
    profilePromise=(async()=>{const d=await db.collection('users').doc(uid).get();trackUsage('reads',1,d.exists?[{id:d.id,...d.data()}]:[]);return d.exists?normalizeUser({id:uid,...d.data()}):null;})();
    try{return await profilePromise;}finally{profilePromise=null;}
  }
  function stop(){pendingFetches.clear();Object.values(refs).forEach(f=>f&&f()); Object.keys(refs).forEach(k=>delete refs[k]); Object.keys(loadedAt).forEach(k=>delete loadedAt[k]); coreLoadedFor=null; liveBusinessDate=null; validatedCashId=null;}
  async function load(){ return new Promise(resolve=>fbAuth.onAuthStateChanged(async u=>{ if(!u){state.currentUser=null;stop();resolve();return;} const profile=await loadProfile(u.uid); if(!profile){await fbAuth.signOut();resolve();return;} state.currentUser=profile; if(!isActive(state.currentUser)){await fbAuth.signOut();state.currentUser=null;resolve();return;} await loadData(); resolve(); })); }
  async function login(email,password){try{const c=await fbAuth.signInWithEmailAndPassword(email,password);const profile=await loadProfile(c.user.uid);if(!profile||!isActive(profile)){await fbAuth.signOut();return{ok:false,error:'Usuario inactivo o sin perfil'}}state.currentUser=profile;await loadData();return{ok:true,user:state.currentUser}}catch(e){return{ok:false,error:'Correo o contraseña incorrectos'}}}
  async function logout(){stop();state.users=[];state.categories=[];state.products=[];state.sales=[];state.movements=[];state.expenses=[];state.cashSessions=[];state.jornadas=[];state.cashMovements=[];state.audits=[];state.cart=[];state.currentUser=null;await fbAuth.signOut()}
  async function audit(accion,detalle){if(!state.currentUser)return;const t=limaParts();await db.collection('audits').add({...t,accion,detalle,usuarioId:state.currentUser.id,usuarioNombre:`${state.currentUser.nombres||''} ${state.currentUser.apellidos||''}`.trim(),createdAt:firebase.firestore.FieldValue.serverTimestamp()});trackUsage('writes',1)}
  async function safeAudit(accion,detalle){
    try{await audit(accion,detalle);}
    catch(e){console.warn('Auditoría no registrada:',accion,e);}
  }
  function requireAdminStore(){
    return !!state.currentUser && state.currentUser.role === 'admin' && isActive(state.currentUser);
  }
  function validEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'')); }
  async function addUser(data){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede crear empleados'};
    const email=String(data?.email||'').trim().toLowerCase(), password=String(data?.password||'');
    const nombres=String(data?.nombres||'').trim(), apellidos=String(data?.apellidos||'').trim();
    if(!validEmail(email))return{ok:false,error:'Ingresa un correo válido'};
    if(!nombres||!apellidos)return{ok:false,error:'Nombre y apellido son obligatorios'};
    if(password.length<6)return{ok:false,error:'La contraseña debe tener al menos 6 caracteres'};
    let secondary=null, createdUser=null;
    try{
      secondary=firebase.initializeApp(firebaseConfig,'userCreator-'+Date.now());
      const cred=await secondary.auth().createUserWithEmailAndPassword(email,password);
      createdUser=cred.user;
      const estado=data?.estado==='Inactivo'?'Inactivo':'Activo';
      const user={email,role:'empleado',nombres,apellidos,dni:String(data?.dni||'').trim(),telefono:String(data?.telefono||'').trim(),estado};
      await db.collection('users').doc(createdUser.uid).set(user);
      trackUsage('writes',1);
      state.users.push({id:createdUser.uid,...user});
      await safeAudit('CREAR_EMPLEADO',user.email);
      return{ok:true,user:{id:createdUser.uid,...user}};
    }catch(e){
      // Si Auth creó la cuenta pero Firestore falló, eliminar la cuenta recién creada
      // evita dejar usuarios huérfanos que luego bloqueen el mismo correo.
      if(createdUser){ try{await createdUser.delete();}catch(_){} }
      return{ok:false,error:e.message||'No se pudo crear el empleado'};
    }finally{
      if(secondary){try{await secondary.auth().signOut()}catch(_){} try{await secondary.delete()}catch(_){}}
    }
  }
  async function updateUser(id,data){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede editar empleados'};
    try{
      const u=getUser(id);if(!u)return{ok:false,error:'Usuario no encontrado'};
      const nombres=String(data?.nombres??u.nombres??'').trim(), apellidos=String(data?.apellidos??u.apellidos??'').trim();
      if(!nombres||!apellidos)return{ok:false,error:'Nombre y apellido son obligatorios'};
      const patch={nombres,apellidos,dni:String(data?.dni??u.dni??'').trim(),telefono:String(data?.telefono??u.telefono??'').trim(),estado:data?.estado==='Inactivo'?'Inactivo':'Activo'};
      await db.collection('users').doc(id).update(patch);trackUsage('writes',1);Object.assign(u,patch);await safeAudit('EDITAR_EMPLEADO',id);return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo editar el empleado'}}
  }
  async function sendPasswordReset(id){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede restablecer contraseñas'};
    try{
      const u=getUser(id); if(!u?.email)return{ok:false,error:'El empleado no tiene un correo válido'};
      await fbAuth.sendPasswordResetEmail(u.email);
      await safeAudit('RESTABLECER_CLAVE_EMPLEADO',id);
      return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo enviar el enlace de restablecimiento'}}
  }
  async function deleteUser(id){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede desactivar empleados'};
    try{
      if(id===state.currentUser?.id)return{ok:false,error:'No puedes desactivar tu propia cuenta'};
      await db.collection('users').doc(id).update({estado:'Inactivo'});trackUsage('writes',1);
      const u=getUser(id);if(u)u.estado='Inactivo';await safeAudit('DESACTIVAR_EMPLEADO',id);return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo desactivar el empleado'}}
  }
  async function addCategory(nombre){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede crear categorías'};
    const n=String(nombre||'').trim();
    if(!n)return{ok:false,error:'Ingresa el nombre de la categoría'};
    if(state.categories.some(c=>String(c.nombre||'').trim().toLowerCase()===n.toLowerCase()))return{ok:false,error:'Ya existe una categoría con ese nombre'};
    try{
      const id=docId(),c={nombre:n,estado:'Activo'};
      await db.collection('categories').doc(id).set(c);trackUsage('writes',1);
      state.categories.push({id,...c});await safeAudit('CREAR_CATEGORIA',c.nombre);
      return{ok:true,category:{id,...c}};
    }catch(e){return{ok:false,error:e.message||'No se pudo crear la categoría'}}
  }
  async function updateCategory(id,data){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede editar categorías'};
    const c=getCategory(id); if(!c)return{ok:false,error:'Categoría no encontrada'};
    const nombre=String(data?.nombre??c.nombre??'').trim();
    if(!nombre)return{ok:false,error:'Ingresa el nombre de la categoría'};
    if(state.categories.some(x=>x.id!==id&&String(x.nombre||'').trim().toLowerCase()===nombre.toLowerCase()))return{ok:false,error:'Ya existe una categoría con ese nombre'};
    try{
      const patch={nombre,estado:data?.estado==='Inactivo'?'Inactivo':'Activo'};
      await db.collection('categories').doc(id).update(patch);trackUsage('writes',1);
      Object.assign(c,patch);await safeAudit('EDITAR_CATEGORIA',id);return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo actualizar la categoría'}}
  }
  async function deleteCategory(id){
    try{
      if(state.currentUser?.role!=='admin')return{ok:false,error:'Solo el administrador puede eliminar categorías'};
      const c=getCategory(id); if(!c)return{ok:false,error:'Categoría no encontrada'};
      // Verificación local inmediata y confirmación contra Firestore para no dejar productos huérfanos.
      const localCount=state.products.filter(p=>p.categoriaId===id).length;
      if(localCount>0)return{ok:false,error:`No se puede eliminar: la categoría tiene ${localCount} producto(s). Elimínalos o muévelos primero.`};
      const linked=await db.collection('products').where('categoriaId','==',id).limit(1).get();
      if(!linked.empty)return{ok:false,error:'No se puede eliminar: todavía existen productos asociados a esta categoría'};
      const ref=db.collection('categories').doc(id), archive=db.collection('deletedCategories').doc(id), t=limaParts();
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref); if(!snap.exists)throw Error('Categoría no encontrada');
        tx.set(archive,{...snap.data(),originalId:id,eliminadoFecha:t.fecha,eliminadoHora:t.hora,eliminadoPor:state.currentUser.id,deletedAt:firebase.firestore.FieldValue.serverTimestamp()});
        tx.delete(ref);
      });
      trackUsage('writes',1);trackUsage('deletes',1);state.categories=state.categories.filter(x=>x.id!==id);
      try{await safeAudit('ELIMINAR_CATEGORIA',`${id}: ${c.nombre||''}`)}catch(err){console.warn('Auditoría categoría eliminada:',err)}
      return{ok:true};
    }catch(e){return{ok:false,error:e?.code==='permission-denied'?'Firestore no permitió eliminar la categoría. Publica las reglas incluidas en esta versión.':(e.message||'No se pudo eliminar la categoría')}}
  }
  function validateProductData(data, current=null){
    const nombre=String(data?.nombre??current?.nombre??'').trim();
    const categoriaId=String(data?.categoriaId??current?.categoriaId??'').trim();
    const precioCompra=Number(data?.precioCompra??current?.precioCompra);
    const precioVenta=Number(data?.precioVenta??current?.precioVenta);
    const stock=Number(data?.stock??current?.stock??0);
    const stockMinimo=Number(data?.stockMinimo??current?.stockMinimo??0);
    if(!nombre)return{ok:false,error:'Ingresa el nombre del producto'};
    if(!categoriaId||!getCategory(categoriaId))return{ok:false,error:'Selecciona una categoría válida'};
    if(!Number.isFinite(precioCompra)||precioCompra<0)return{ok:false,error:'Precio de compra inválido'};
    if(!Number.isFinite(precioVenta)||precioVenta<0)return{ok:false,error:'Precio de venta inválido'};
    if(!Number.isFinite(stock)||stock<0||!Number.isInteger(stock))return{ok:false,error:'El stock debe ser un número entero mayor o igual a 0'};
    if(!Number.isFinite(stockMinimo)||stockMinimo<0||!Number.isInteger(stockMinimo))return{ok:false,error:'El stock mínimo debe ser un número entero mayor o igual a 0'};
    return{ok:true,value:{nombre,categoriaId,precioCompra,precioVenta,stock,stockMinimo,descripcion:String(data?.descripcion??current?.descripcion??'').trim(),imagen:String(data?.imagen??current?.imagen??'📦').trim()||'📦',estado:data?.estado==='Inactivo'?'Inactivo':'Activo'}};
  }
  async function addProduct(data){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede crear productos'};
    const v=validateProductData(data); if(!v.ok)return v;
    try{
      const id=docId(),t=limaParts(),p=v.value,stock=p.stock,jornadaId=journeyIdForCurrent();
      const b=db.batch();b.set(db.collection('products').doc(id),p);
      if(stock>0){
        const mid=docId();
        b.set(db.collection('movements').doc(mid),{...t,...(jornadaId?{jornadaId,cajaId:jornadaId}:{}),productoId:id,productoNombre:p.nombre,tipo:'Entrada',cantidad:stock,stockAnterior:0,stockNuevo:stock,usuarioId:state.currentUser.id,motivo:'Stock inicial'});
        if(p.precioCompra>0)b.set(db.collection('expenses').doc(),{...t,...(jornadaId?{jornadaId,cajaId:jornadaId}:{}),concepto:`Stock inicial: ${p.nombre}`,categoria:'Stock',monto:+(stock*p.precioCompra).toFixed(2),origen:'Stock inicial',metodoPago:'Otro',usuarioId:state.currentUser.id});
      }
      await b.commit();trackUsage('writes',1+(stock>0?1:0)+(stock>0&&p.precioCompra>0?1:0));
      if(!state.products.some(x=>x.id===id))state.products.push({id,...p});
      await safeAudit('CREAR_PRODUCTO',p.nombre);return{ok:true,product:{id,...p}};
    }catch(e){return{ok:false,error:e.message||'No se pudo crear el producto'}}
  }
  async function updateProduct(id,data){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede editar productos'};
    const p=getProduct(id);if(!p)return{ok:false,error:'Producto no encontrado'};
    const v=validateProductData({...data,stock:p.stock},p); if(!v.ok)return v;
    try{
      const {stock,...patch}=v.value;
      await db.collection('products').doc(id).update(patch);trackUsage('writes',1);Object.assign(p,patch);await safeAudit('EDITAR_PRODUCTO',p.nombre);return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo actualizar el producto'}}
  }
  async function deleteProduct(id){
    try{
      if(state.currentUser?.role!=='admin')return{ok:false,error:'Solo el administrador puede eliminar productos'};
      const p=getProduct(id); if(!p)return{ok:false,error:'Producto no encontrado'};
      const ref=db.collection('products').doc(id), archive=db.collection('deletedProducts').doc(id), t=limaParts();
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref); if(!snap.exists)throw Error('Producto no encontrado');
        const data=snap.data(), stockAlEliminar=Number(data.stock||0);
        tx.set(archive,{...data,originalId:id,categoriaNombre:getCategory(data.categoriaId)?.nombre||'',stockAlEliminar,stockDevueltoPorAnulaciones:0,eliminadoFecha:t.fecha,eliminadoHora:t.hora,eliminadoPor:state.currentUser.id,deletedAt:firebase.firestore.FieldValue.serverTimestamp()});
        if(stockAlEliminar>0)tx.set(db.collection('movements').doc(),{...t,...(journeyIdForCurrent()?{jornadaId:journeyIdForCurrent(),cajaId:journeyIdForCurrent()}:{}),productoId:id,productoNombre:data.nombre||'',tipo:'Eliminación',cantidad:stockAlEliminar,stockAnterior:stockAlEliminar,stockNuevo:0,usuarioId:state.currentUser.id,motivo:'Producto eliminado del catálogo'});
        tx.delete(ref);
      });
      trackUsage('writes',1+(Number(p.stock||0)>0?1:0));trackUsage('deletes',1);
      state.products=state.products.filter(x=>x.id!==id);
      state.cart=state.cart.filter(x=>x.productoId!==id);
      try{await safeAudit('ELIMINAR_PRODUCTO',`${id}: ${p.nombre||''}`)}catch(err){console.warn('Auditoría producto eliminado:',err)}
      return{ok:true};
    }catch(e){return{ok:false,error:e?.code==='permission-denied'?'Firestore no permitió eliminar el producto. Publica las reglas incluidas en esta versión.':(e.message||'No se pudo eliminar el producto')}}
  }
  async function addMovement({productoId,tipo,cantidad,costoUnitario,motivo}){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede registrar movimientos manuales'};
    const allowed=['Entrada','Salida','Merma','Ajuste +','Ajuste -'];
    cantidad=Number(cantidad); costoUnitario=Number(costoUnitario||0);
    if(!allowed.includes(tipo))return{ok:false,error:'Tipo de movimiento inválido'};
    if(!Number.isFinite(cantidad)||cantidad<=0||!Number.isInteger(cantidad))return{ok:false,error:'La cantidad debe ser un entero mayor a 0'};
    if(!Number.isFinite(costoUnitario)||costoUnitario<0)return{ok:false,error:'Costo unitario inválido'};
    const pr=db.collection('products').doc(productoId);
    const jornadaId=journeyIdForCurrent();
    try{
      await db.runTransaction(async tx=>{
        const s=await tx.get(pr);if(!s.exists)throw Error('Producto no encontrado');
        const p=s.data(),old=Number(p.stock)||0;const negative=['Salida','Merma','Ajuste -'].includes(tipo);const neu=negative?old-cantidad:old+cantidad;
        if(neu<0)throw Error('Stock insuficiente');
        const t=limaParts(),m={...t,...(jornadaId?{jornadaId,cajaId:jornadaId}:{}),productoId,productoNombre:p.nombre,tipo,cantidad,stockAnterior:old,stockNuevo:neu,usuarioId:state.currentUser.id,motivo:String(motivo||'').trim()};
        // El precio de compra maestro del inventario se conserva. Un ingreso de stock puede tener un costo puntual distinto sin sobrescribirlo.
        tx.update(pr,{stock:neu});
        tx.set(db.collection('movements').doc(),m);
        if(tipo==='Entrada'&&costoUnitario>0)tx.set(db.collection('expenses').doc(),{...t,...(jornadaId?{jornadaId,cajaId:jornadaId}:{}),concepto:`Compra de stock: ${p.nombre}`,categoria:'Stock',monto:+(cantidad*costoUnitario).toFixed(2),origen:'Compra de stock',metodoPago:'Otro',usuarioId:state.currentUser.id});
      });
      await safeAudit('MOVIMIENTO_STOCK',`${tipo} ${productoId} x${cantidad}`);return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo registrar el movimiento'}}
  }
  function addToCart(productoId,qty=1){
    qty=Number(qty);
    if(!Number.isInteger(qty)||qty<=0)return{ok:false,error:'Cantidad inválida'};
    const p=getProduct(productoId);if(!p||p.estado!=='Activo'||p.stock<=0)return{ok:false,error:'Producto no disponible'};
    const i=state.cart.find(x=>x.productoId===productoId),n=(i?.cantidad||0)+qty;
    if(n>p.stock)return{ok:false,error:`Stock insuficiente (disponible: ${p.stock})`};
    i?i.cantidad=n:state.cart.push({productoId,cantidad:qty});return{ok:true};
  }
  function updateCartQty(id,c){
    c=Number(c);
    const p=getProduct(id);if(!p)return{ok:false,error:'Producto no encontrado'};
    if(!Number.isInteger(c))return{ok:false,error:'Cantidad inválida'};
    if(c<=0){state.cart=state.cart.filter(x=>x.productoId!==id);return{ok:true};}
    if(c>p.stock)return{ok:false,error:`Máximo ${p.stock} unidades`};
    const i=state.cart.find(x=>x.productoId===id);if(i)i.cantidad=c;return{ok:true};
  }
  function removeFromCart(id){state.cart=state.cart.filter(x=>x.productoId!==id)} function clearCart(){state.cart=[]}
  function getCartTotal(){return state.cart.reduce((s,i)=>s+(getProduct(i.productoId)?.precioVenta||0)*i.cantidad,0)}
  let validatedCashId=null;
  async function ensureCashLock(caja){
    const u=state.currentUser;
    if(!u||!caja?.id)return{ok:false,error:'Caja inválida'};
    if(validatedCashId===caja.id)return{ok:true};
    const lockRef=db.collection('cashLocks').doc(u.id);
    try{
      await db.runTransaction(async tx=>{
        const lockSnap=await tx.get(lockRef);
        if(lockSnap.exists && lockSnap.data().cajaId===caja.id)return;
        let otherCashSnap=null;
        if(lockSnap.exists && lockSnap.data().cajaId){
          otherCashSnap=await tx.get(db.collection('cashSessions').doc(lockSnap.data().cajaId));
        }
        if(otherCashSnap?.exists && otherCashSnap.data().estado==='Abierta')throw Error('Existe otra caja abierta vinculada a tu usuario');
        tx.set(lockRef,{usuarioId:u.id,cajaId:caja.id,jornadaId:caja.jornadaId||caja.id,estado:'Abierta',fecha:caja.fecha||today(),hora:caja.hora||limaParts().hora,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      trackUsage('reads',1);trackUsage('writes',1);validatedCashId=caja.id;return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo validar la caja activa'}}
  }
  async function confirmSale(paymentInput,discountInput={}){
    const u=state.currentUser;
    if(!u||!isActive(u))return{ok:false,error:'Sesión no válida'};
    if(!state.cart.length)return{ok:false,error:'Carrito vacío'};
    if(state.cart.length>100)return{ok:false,error:'La venta excede el máximo de 100 productos distintos'};
    const allowed=['Efectivo','Yape','Plin','Tarjeta'];
    const split=Array.isArray(paymentInput);
    let requestedPayments=[];
    if(split){
      requestedPayments=paymentInput.map(p=>({metodo:String(p?.metodo||''),monto:+Number(p?.monto||0).toFixed(2)}));
      if(requestedPayments.length!==2)return{ok:false,error:'El pago por separado debe tener exactamente 2 partes'};
      if(requestedPayments.some(p=>!allowed.includes(p.metodo)))return{ok:false,error:'Uno de los métodos de pago no es válido'};
      if(requestedPayments[0].metodo===requestedPayments[1].metodo)return{ok:false,error:'Selecciona dos métodos de pago diferentes'};
      if(requestedPayments.some(p=>!Number.isFinite(p.monto)||p.monto<=0))return{ok:false,error:'Cada parte del pago debe ser mayor a S/ 0.00'};
    }else{
      const metodo=String(paymentInput||'');
      if(!allowed.includes(metodo))return{ok:false,error:'Método de pago inválido'};
      requestedPayments=[{metodo,monto:null}];
    }
    for(const i of state.cart){
      if(!i?.productoId||!Number.isInteger(Number(i.cantidad))||Number(i.cantidad)<=0)return{ok:false,error:'El carrito contiene una cantidad inválida'};
    }
    await refreshDailyContext();
    const caja=getOpenCash(u.id);
    if(!caja)return{ok:false,error:'Debes abrir una jornada antes de registrar una venta'};
    const jornada=getOpenJourney(u.id)||await ensureJourneyForOpenCash(caja);
    if(!jornada)return{ok:false,error:'No se pudo validar la jornada activa'};
    const lock=await ensureCashLock(caja);if(!lock.ok)return lock;
    const saleRef=db.collection('sales').doc();
    let savedPayments=[],savedMethod='';
    try{
      await db.runTransaction(async tx=>{
        const snaps=[];
        for(const i of state.cart)snaps.push([i,await tx.get(db.collection('products').doc(i.productoId))]);
        const items=[];let total=0,costo=0;
        for(const [i,s] of snaps){
          if(!s.exists)throw Error('Uno de los productos ya no existe');
          const p=s.data(),qty=Number(i.cantidad),stock=Number(p.stock),precioVenta=Number(p.precioVenta),precioCompra=Number(p.precioCompra||0);
          if(p.estado!=='Activo')throw Error(`${p.nombre||'Producto'} no está activo`);
          if(!Number.isInteger(stock)||stock<qty)throw Error(`Stock insuficiente para ${p.nombre||'producto'}`);
          if(!Number.isFinite(precioVenta)||precioVenta<0||!Number.isFinite(precioCompra)||precioCompra<0)throw Error(`Precio inválido en ${p.nombre||'producto'}`);
          const sub=precioVenta*qty;
          items.push({productoId:s.id,nombre:String(p.nombre||''),cantidad:qty,precioUnitario:precioVenta,costoUnitario:precioCompra,subtotal:+sub.toFixed(2)});
          total+=sub;costo+=precioCompra*qty;
          tx.update(s.ref,{stock:stock-qty});
          const t=limaParts();
          tx.set(db.collection('movements').doc(),{...t,jornadaId:jornada.id,cajaId:caja.id,productoId:s.id,productoNombre:String(p.nombre||''),tipo:'Venta',cantidad:qty,stockAnterior:stock,stockNuevo:stock-qty,usuarioId:u.id,motivo:`Venta ${saleRef.id}`});
        }
        total=+total.toFixed(2);costo=+costo.toFixed(2);
        const subtotal=total;
        const descuentoTipo=discountInput?.type==='percent'?'percent':'amount';
        const descuentoValor=Number(discountInput?.value||0);
        if(!Number.isFinite(descuentoValor)||descuentoValor<0||(descuentoTipo==='percent'&&descuentoValor>100))throw Error('Descuento inválido');
        const descuentoMonto=+(descuentoTipo==='percent'?subtotal*descuentoValor/100:descuentoValor).toFixed(2);
        if(descuentoMonto>subtotal)throw Error('El descuento supera el subtotal');
        if(subtotal>0&&descuentoMonto/subtotal>0.2000001&&u.role!=='admin')throw Error('Descuentos superiores al 20% requieren administrador');
        total=+(subtotal-descuentoMonto).toFixed(2);
        if(!Number.isFinite(total)||total<=0)throw Error('El total de la venta debe ser mayor a S/ 0.00');
        if(split){
          const paymentTotal=+requestedPayments.reduce((a,p)=>a+Number(p.monto||0),0).toFixed(2);
          if(Math.abs(paymentTotal-total)>0.009)throw Error(`Las dos partes deben sumar exactamente ${total.toFixed(2)}`);
          savedPayments=requestedPayments.map(p=>({metodo:p.metodo,monto:+p.monto.toFixed(2)}));
          savedMethod='Pago separado';
        }else{
          savedPayments=[{metodo:requestedPayments[0].metodo,monto:total}];
          savedMethod=requestedPayments[0].metodo;
        }
        const t=limaParts();
        tx.set(saleRef,{...t,numero:`V-${saleRef.id.slice(0,6).toUpperCase()}`,empleadoId:u.id,empleadoNombre:`${u.nombres} ${u.apellidos}`.trim(),cajaId:caja.id,jornadaId:jornada.id,items,subtotal,descuentoTipo,descuentoValor,descuentoMonto,total,costoTotal:costo,metodoPago:savedMethod,pagos:savedPayments,estado:'Completada',createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      trackUsage('reads',state.cart.length);trackUsage('writes',1+state.cart.length*2);
      delete loadedAt[`cashSales:${caja.id}`];delete loadedAt[`journeySalesAdmin:${jornada.id}`];
      state.cart=[];await safeAudit('VENTA',`${saleRef.id} · ${savedPayments.map(p=>`${p.metodo} S/${p.monto.toFixed(2)}`).join(' + ')}`);
      return{ok:true,sale:{id:saleRef.id,numero:`V-${saleRef.id.slice(0,6).toUpperCase()}`,metodoPago:savedMethod,pagos:savedPayments}};
    }catch(e){return{ok:false,error:e.message||'No se pudo registrar la venta'}}
  }
  async function cancelSale(id,motivo='Sin motivo'){
    motivo=String(motivo||'').trim(); if(!motivo)return{ok:false,error:'Debes indicar el motivo de anulación'};
    if(state.currentUser?.role!=='admin')return{ok:false,error:'Solo el administrador puede anular ventas'};
    try{
      const sr=db.collection('sales').doc(id);
      await db.runTransaction(async tx=>{
        // 1) TODAS las lecturas primero.
        const ss=await tx.get(sr); if(!ss.exists)throw Error('Venta no encontrada');
        const sale=ss.data(); if(sale.estado==='Anulada')throw Error('La venta ya está anulada');
        if(sale.estado!=='Completada')throw Error('La venta no se encuentra en un estado que pueda anularse');

        let cashRef=null,cashSnap=null,journeyRef=null,journeySnap=null;
        if(sale.cajaId){ cashRef=db.collection('cashSessions').doc(sale.cajaId); cashSnap=await tx.get(cashRef); }
        const journeyId=sale.jornadaId||sale.cajaId||'';
        if(journeyId){ journeyRef=db.collection('jornadas').doc(journeyId); journeySnap=await tx.get(journeyRef); }

        const items=Array.isArray(sale.items)?sale.items:[];
        if(!items.length)throw Error('La venta no contiene productos para devolver');
        const productReads=[];
        for(const i of items){
          if(!i.productoId)throw Error('La venta contiene un producto inválido');
          const ref=db.collection('products').doc(i.productoId), snap=await tx.get(ref);
          let archiveRef=null,archiveSnap=null;
          if(!snap.exists){
            archiveRef=db.collection('deletedProducts').doc(i.productoId);
            archiveSnap=await tx.get(archiveRef);
          }
          if(!snap.exists&&!archiveSnap?.exists)throw Error(`Producto no encontrado ni archivado: ${i.nombre||i.productoId}`);
          const qty=Number(i.cantidad||0); if(!Number.isFinite(qty)||qty<=0)throw Error(`Cantidad inválida en ${i.nombre||'producto'}`);
          productReads.push({item:i,ref,snap,archiveRef,archiveSnap,qty});
        }

        // 2) Escrituras después de terminar las lecturas.
        const t=limaParts();
        for(const x of productReads){
          if(x.snap.exists){
            const old=Number(x.snap.data().stock||0),neu=old+x.qty;
            tx.update(x.ref,{stock:neu});
            tx.set(db.collection('movements').doc(),{...t,jornadaId:sale.jornadaId||sale.cajaId||null,cajaId:sale.cajaId||null,productoId:x.item.productoId,productoNombre:x.item.nombre||x.snap.data().nombre||'',tipo:'Devolución',cantidad:x.qty,stockAnterior:old,stockNuevo:neu,usuarioId:state.currentUser.id,motivo:`Anulación ${id}: ${motivo}`});
          }else{
            // El producto fue eliminado del catálogo. La devolución se conserva en su archivo
            // para no revivirlo ni perder trazabilidad del stock histórico.
            const archived=x.archiveSnap.data(),old=Number(archived.stockDevueltoPorAnulaciones||0),neu=old+x.qty;
            tx.update(x.archiveRef,{stockDevueltoPorAnulaciones:neu,ultimaDevolucionFecha:t.fecha,ultimaDevolucionHora:t.hora,ultimaVentaAnuladaId:id});
            tx.set(db.collection('movements').doc(),{...t,jornadaId:sale.jornadaId||sale.cajaId||null,cajaId:sale.cajaId||null,productoId:x.item.productoId,productoNombre:x.item.nombre||archived.nombre||'',tipo:'Devolución',cantidad:x.qty,stockAnterior:old,stockNuevo:neu,productoEliminado:true,usuarioId:state.currentUser.id,motivo:`Anulación ${id}: ${motivo} · producto eliminado del catálogo`});
          }
        }

        // Si la caja ya fue cerrada, mantener su resumen contable consistente, incluso en pagos separados.
        if(cashSnap?.exists && cashSnap.data().estado==='Cerrada'){
          const c=cashSnap.data(), total=Number(sale.total||0), pagos=getSalePayments(sale);
          const pagoPorMetodo={Efectivo:0,Yape:0,Plin:0,Tarjeta:0};
          pagos.forEach(p=>{pagoPorMetodo[p.metodo]+=Number(p.monto||0)});
          const patch={
            totalVentasDia:+Math.max(0,Number(c.totalVentasDia||0)-total).toFixed(2),
            cantidadVentasDia:Math.max(0,Number(c.cantidadVentasDia||0)-1),
            ajustePorAnulacion:true,
            ultimaAnulacionId:id,
            ultimaAnulacionFecha:t.fecha,
            ultimaAnulacionHora:t.hora
          };
          const fields={Efectivo:'efectivoVentas',Yape:'yapeVentas',Plin:'plinVentas',Tarjeta:'tarjetaVentas'};
          Object.entries(fields).forEach(([metodo,field])=>{
            const amount=Number(pagoPorMetodo[metodo]||0);
            if(amount>0)patch[field]=+Math.max(0,Number(c[field]||0)-amount).toFixed(2);
          });
          if(pagoPorMetodo.Efectivo>0){
            patch.esperado=+Math.max(0,Number(c.esperado||0)-pagoPorMetodo.Efectivo).toFixed(2);
            patch.diferencia=+(Number(c.real||0)-patch.esperado).toFixed(2);
          }
          tx.update(cashRef,patch);
        }
        // Mantener también el resumen de la jornada cerrada consistente.
        if(journeySnap?.exists && journeySnap.data().estado==='Cerrada'){
          const j=journeySnap.data(), total=Number(sale.total||0), pagos=getSalePayments(sale);
          const pagoPorMetodo={Efectivo:0,Yape:0,Plin:0,Tarjeta:0};
          pagos.forEach(p=>{pagoPorMetodo[p.metodo]+=Number(p.monto||0)});
          const jpatch={
            totalVentas:+Math.max(0,Number(j.totalVentas||0)-total).toFixed(2),
            cantidadVentas:Math.max(0,Number(j.cantidadVentas||0)-1),
            ajustePorAnulacion:true,
            ultimaAnulacionId:id,
            ultimaAnulacionFecha:t.fecha,
            ultimaAnulacionHora:t.hora
          };
          const fields={Efectivo:'efectivoVentas',Yape:'yapeVentas',Plin:'plinVentas',Tarjeta:'tarjetaVentas'};
          Object.entries(fields).forEach(([metodo,field])=>{
            const amount=Number(pagoPorMetodo[metodo]||0);
            if(amount>0)jpatch[field]=+Math.max(0,Number(j[field]||0)-amount).toFixed(2);
          });
          if(pagoPorMetodo.Efectivo>0){
            jpatch.efectivoEsperado=+Math.max(0,Number(j.efectivoEsperado||0)-pagoPorMetodo.Efectivo).toFixed(2);
            jpatch.diferencia=+(Number(j.efectivoReal||0)-jpatch.efectivoEsperado).toFixed(2);
          }
          tx.update(journeyRef,jpatch);
        }
        tx.update(sr,{estado:'Anulada',motivoAnulacion:motivo,anuladaPor:state.currentUser.id,fechaAnulacion:t.fecha,horaAnulacion:t.hora});
      });
      // Reflejar de inmediato la anulación en memoria, incluso si la venta pertenece
      // a un día anterior y ya no está cubierta por el listener de "hoy".
      const localSale=state.sales.find(x=>x.id===id);
      if(localSale){const t=limaParts();Object.assign(localSale,{estado:'Anulada',motivoAnulacion:motivo,anuladaPor:state.currentUser.id,fechaAnulacion:t.fecha,horaAnulacion:t.hora});}
      await safeAudit('ANULAR_VENTA',`${id}: ${motivo}`);
      return{ok:true};
    }catch(e){
      console.error('Error anulando venta:',e);
      return{ok:false,error:e?.code==='permission-denied'?'Firestore rechazó la anulación. Publica las reglas incluidas en esta versión.':(e.message||'No se pudo anular la venta')};
    }
  }

  async function addExpense(data){
    const concepto=String(data?.concepto||'').trim();
    const categoria=String(data?.categoria||'Otros').trim();
    const monto=Number(data?.monto);
    const u=state.currentUser;
    if(!u)return{ok:false,error:'Sesión no válida'};
    if(u.role!=='admin')return{ok:false,error:'Solo el administrador puede registrar gastos manuales'};
    if(!concepto)return{ok:false,error:'Ingresa el concepto del gasto'};
    if(!Number.isFinite(monto)||monto<=0)return{ok:false,error:'Ingresa un monto válido mayor a S/ 0.00'};
    const permitidas=['Alquiler','Servicios','Personal','Mantenimiento','Otros'];
    if(!permitidas.includes(categoria))return{ok:false,error:'Selecciona una categoría válida'};
    const metodoPago=String(data?.metodoPago||'Otro').trim();
    const metodos=['Efectivo','Yape','Plin','Tarjeta','Otro'];
    if(!metodos.includes(metodoPago))return{ok:false,error:'Selecciona una forma de pago válida'};
    const t=limaParts();
    const jornadaId=journeyIdForCurrent();
    const payload={...t,...(jornadaId?{jornadaId,cajaId:jornadaId}:{}),concepto,categoria,monto:+monto.toFixed(2),metodoPago,origen:'Manual',usuarioId:u.id,usuarioNombre:`${u.nombres||''} ${u.apellidos||''}`.trim(),createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{
      const ref=await db.collection('expenses').add(payload);trackUsage('writes',1);
      if(!state.expenses.some(e=>e.id===ref.id))state.expenses.push({id:ref.id,...payload});if(jornadaId)delete loadedAt['expensesJourney:'+jornadaId];
      try{await safeAudit('REGISTRAR_GASTO',`${concepto} · S/${monto.toFixed(2)}`)}catch(err){console.warn('Auditoría gasto:',err)}
      return{ok:true,id:ref.id};
    }catch(e){
      console.error('Error registrando gasto:',e);
      return{ok:false,error:e?.code==='permission-denied'?'Firestore no permitió registrar el gasto. Verifica que ingresaste como administrador y que las reglas estén publicadas.':(e.message||'No se pudo registrar el gasto')};
    }
  }

  async function updateExpense(id,data){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede editar gastos'};
    const e=state.expenses.find(x=>x.id===id);if(!e)return{ok:false,error:'Gasto no encontrado'};

    const concepto=String(data?.concepto??e.concepto??'').trim();
    const categoria=String(data?.categoria??e.categoria??'Otros').trim();
    const monto=Number(data?.monto??e.monto);
    const metodoPago=String(data?.metodoPago??e.metodoPago??'Otro').trim();
    const permitidas=['Stock','Alquiler','Servicios','Personal','Mantenimiento','Otros'];
    const metodos=['Efectivo','Yape','Plin','Tarjeta','Otro'];
    if(!concepto)return{ok:false,error:'Ingresa el concepto del gasto'};
    if(!permitidas.includes(categoria))return{ok:false,error:'Selecciona una categoría válida'};
    if(!Number.isFinite(monto)||monto<=0)return{ok:false,error:'Ingresa un monto válido mayor a S/ 0.00'};
    if(!metodos.includes(metodoPago))return{ok:false,error:'Selecciona una forma de pago válida'};
    const patch={concepto,categoria,monto:+monto.toFixed(2),metodoPago};
    try{
      const expRef=db.collection('expenses').doc(id);
      const jornadaId=e.jornadaId||e.cajaId||'';
      if(jornadaId){
        const journeyRef=db.collection('jornadas').doc(jornadaId),cashRef=db.collection('cashSessions').doc(e.cajaId||jornadaId);
        await db.runTransaction(async tx=>{
          const [expSnap,jSnap,cSnap]=await Promise.all([tx.get(expRef),tx.get(journeyRef),tx.get(cashRef)]);
          if(!expSnap.exists)throw Error('Gasto no encontrado');
          const old=expSnap.data();
          tx.set(db.collection('expenseRevisions').doc(),{gastoId:id,accion:'EDITAR',anterior:old,nuevo:patch,usuarioId:state.currentUser.id,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
          tx.update(expRef,patch);
          if(jSnap.exists&&jSnap.data().estado==='Cerrada'){
            const j=jSnap.data(),oldCash=String(old.metodoPago||'Otro')==='Efectivo'?Number(old.monto||0):0,newCash=metodoPago==='Efectivo'?Number(patch.monto||0):0;
            const delta=Number(patch.monto||0)-Number(old.monto||0),deltaCash=newCash-oldCash;
            const expected=+(Number(j.efectivoEsperado||0)-deltaCash).toFixed(2);
            tx.update(journeyRef,{totalGastos:+Math.max(0,Number(j.totalGastos||0)+delta).toFixed(2),gastosEfectivo:+Math.max(0,Number(j.gastosEfectivo||0)+deltaCash).toFixed(2),efectivoEsperado:expected,diferencia:+(Number(j.efectivoReal||0)-expected).toFixed(2),ajustePorGasto:true,ultimoGastoAjustadoId:id});
            if(cSnap.exists&&cSnap.data().estado==='Cerrada'){
              const c=cSnap.data(),cExpected=+(Number(c.esperado||0)-deltaCash).toFixed(2);
              tx.update(cashRef,{gastosEfectivo:+Math.max(0,Number(c.gastosEfectivo||0)+deltaCash).toFixed(2),esperado:cExpected,diferencia:+(Number(c.real||0)-cExpected).toFixed(2),ajustePorGasto:true,ultimoGastoAjustadoId:id});
            }
          }
        });
      }else await db.runTransaction(async tx=>{
        const snap=await tx.get(expRef);if(!snap.exists)throw Error('Gasto no encontrado');
        tx.set(db.collection('expenseRevisions').doc(),{gastoId:id,accion:'EDITAR',anterior:snap.data(),nuevo:patch,usuarioId:state.currentUser.id,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
        tx.update(expRef,patch);
      });
      Object.assign(e,patch);
      if(jornadaId){delete loadedAt.journeyHistory;delete loadedAt['expensesJourney:'+jornadaId];}
      await safeAudit('EDITAR_GASTO',`${id}: ${concepto} · S/${monto.toFixed(2)}`);
      return{ok:true};
    }catch(err){return{ok:false,error:err.message||'No se pudo editar el gasto'}}
  }
  async function deleteExpense(id){
    if(!requireAdminStore())return{ok:false,error:'Solo el administrador puede eliminar gastos'};
    const e=state.expenses.find(x=>x.id===id);if(!e)return{ok:false,error:'Gasto no encontrado'};

    try{
      const expRef=db.collection('expenses').doc(id),jornadaId=e.jornadaId||e.cajaId||'';
      if(jornadaId){
        const journeyRef=db.collection('jornadas').doc(jornadaId),cashRef=db.collection('cashSessions').doc(e.cajaId||jornadaId);
        await db.runTransaction(async tx=>{
          const [expSnap,jSnap,cSnap]=await Promise.all([tx.get(expRef),tx.get(journeyRef),tx.get(cashRef)]);
          if(!expSnap.exists)throw Error('Gasto no encontrado');
          const old=expSnap.data();
          tx.set(db.collection('deletedExpenses').doc(id),{...old,originalId:id,eliminadoPor:state.currentUser.id,deletedAt:firebase.firestore.FieldValue.serverTimestamp()});
          tx.delete(expRef);
          if(jSnap.exists&&jSnap.data().estado==='Cerrada'){
            const j=jSnap.data(),cashAmount=String(old.metodoPago||'Otro')==='Efectivo'?Number(old.monto||0):0;
            const expected=+(Number(j.efectivoEsperado||0)+cashAmount).toFixed(2);
            tx.update(journeyRef,{totalGastos:+Math.max(0,Number(j.totalGastos||0)-Number(old.monto||0)).toFixed(2),gastosEfectivo:+Math.max(0,Number(j.gastosEfectivo||0)-cashAmount).toFixed(2),efectivoEsperado:expected,diferencia:+(Number(j.efectivoReal||0)-expected).toFixed(2),ajustePorGasto:true,ultimoGastoAjustadoId:id});
            if(cSnap.exists&&cSnap.data().estado==='Cerrada'){
              const c=cSnap.data(),cExpected=+(Number(c.esperado||0)+cashAmount).toFixed(2);
              tx.update(cashRef,{gastosEfectivo:+Math.max(0,Number(c.gastosEfectivo||0)-cashAmount).toFixed(2),esperado:cExpected,diferencia:+(Number(c.real||0)-cExpected).toFixed(2),ajustePorGasto:true,ultimoGastoAjustadoId:id});
            }
          }
        });
      }else await db.runTransaction(async tx=>{
        const snap=await tx.get(expRef);if(!snap.exists)throw Error('Gasto no encontrado');
        tx.set(db.collection('deletedExpenses').doc(id),{...snap.data(),originalId:id,eliminadoPor:state.currentUser.id,deletedAt:firebase.firestore.FieldValue.serverTimestamp()});
        tx.delete(expRef);
      });
      state.expenses=state.expenses.filter(x=>x.id!==id);
      if(jornadaId){delete loadedAt.journeyHistory;delete loadedAt['expensesJourney:'+jornadaId];}
      await safeAudit('ELIMINAR_GASTO',`${id}: ${e.concepto||''} · S/${Number(e.monto||0).toFixed(2)}`);
      return{ok:true};
    }catch(err){return{ok:false,error:err.message||'No se pudo eliminar el gasto'}}
  }

  async function addCashMovement({tipo,monto,concepto}){
    const u=state.currentUser;if(!u||!isActive(u))return{ok:false,error:'Sesión no válida'};
    tipo=String(tipo||'').trim();monto=Number(monto);concepto=String(concepto||'').trim();
    if(!['Ingreso','Retiro'].includes(tipo))return{ok:false,error:'Tipo de movimiento de caja inválido'};
    if(!Number.isFinite(monto)||monto<=0)return{ok:false,error:'Ingresa un monto mayor a S/ 0.00'};
    if(!concepto)return{ok:false,error:'Indica el motivo del movimiento'};
    const caja=getOpenCash(u.id),jornada=getOpenJourney(u.id);
    if(!caja||!jornada)return{ok:false,error:'Debes tener una jornada abierta'};
    const t=limaParts();
    const payload={...t,jornadaId:jornada.id,cajaId:caja.id,tipo,monto:+monto.toFixed(2),concepto,usuarioId:u.id,usuarioNombre:`${u.nombres||''} ${u.apellidos||''}`.trim(),createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{
      const ref=await db.collection('cashMovements').add(payload);trackUsage('writes',1);
      state.cashMovements.push({id:ref.id,...payload});delete loadedAt['cashMovementsJourney:'+jornada.id];
      await safeAudit(tipo==='Ingreso'?'INGRESO_CAJA':'RETIRO_CAJA',`${concepto} · S/${monto.toFixed(2)} · ${jornada.numero||journeyNumber(jornada.id)}`);
      return{ok:true,id:ref.id};
    }catch(e){return{ok:false,error:e?.code==='permission-denied'?'Firestore no permitió registrar el movimiento de caja. Publica las reglas v35.':(e.message||'No se pudo registrar el movimiento de caja')}}
  }

  function today(){return limaParts().fecha} function salesToday(){return state.sales.filter(s=>s.fecha===today()&&s.estado!=='Anulada')} function expensesToday(){return state.expenses.filter(e=>e.fecha===today())} function totalSales(fn){return (fn?state.sales.filter(fn):state.sales).filter(s=>s.estado!=='Anulada').reduce((a,b)=>a+Number(b.total||0),0)} function totalExpenses(fn){return(fn?state.expenses.filter(fn):state.expenses).reduce((a,b)=>a+Number(b.monto||0),0)}
  async function openCash(initial){
    initial=Number(initial);
    if(!Number.isFinite(initial)||initial<0)return{ok:false,error:'Monto inicial inválido'};
    const u=state.currentUser,t=limaParts();
    if(!u)return{ok:false,error:'Sesión no válida'};
    if(getOpenCash(u.id)||getOpenJourney(u.id))return{ok:false,error:'Ya tienes una jornada abierta'};

    const ref=db.collection('cashSessions').doc(), cashId=ref.id;
    const journeyRef=db.collection('jornadas').doc(cashId);
    const lockRef=db.collection('cashLocks').doc(u.id);
    const usuarioNombre=`${u.nombres||''} ${u.apellidos||''}`.trim();
    const cashPayload={...t,usuarioId:u.id,usuarioNombre,montoInicial:+initial.toFixed(2),jornadaId:cashId,estado:'Abierta',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    const journeyPayload={numero:journeyNumber(cashId),fechaApertura:t.fecha,horaApertura:t.hora,usuarioId:u.id,usuarioNombre,cajaId:cashId,montoInicial:+initial.toFixed(2),estado:'Abierta',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{
      await db.runTransaction(async tx=>{
        const lockSnap=await tx.get(lockRef);
        let previousCashSnap=null;
        if(lockSnap.exists && lockSnap.data().cajaId)previousCashSnap=await tx.get(db.collection('cashSessions').doc(lockSnap.data().cajaId));
        if(previousCashSnap?.exists && previousCashSnap.data().estado==='Abierta')throw Error('Ya tienes una jornada abierta en otro dispositivo o pestaña');
        tx.set(ref,cashPayload);
        tx.set(journeyRef,journeyPayload);
        tx.set(lockRef,{usuarioId:u.id,cajaId:cashId,jornadaId:cashId,estado:'Abierta',fecha:t.fecha,hora:t.hora,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      trackUsage('reads',1);trackUsage('writes',3);
      if(!state.cashSessions.some(x=>x.id===cashId))state.cashSessions.push({id:cashId,...cashPayload});
      if(!state.jornadas.some(x=>x.id===cashId))state.jornadas.push({id:cashId,...journeyPayload});
      validatedCashId=cashId;
      try{await safeAudit('ABRIR_JORNADA',`${journeyPayload.numero} · Monto inicial S/${initial.toFixed(2)}`);}catch(err){console.warn('Auditoría de apertura:',err);}
      return{ok:true,id:cashId,jornadaId:cashId,numero:journeyPayload.numero};
    }catch(e){
      return{ok:false,error:e?.code==='permission-denied'?'No se pudo abrir la jornada. Publica las reglas Firestore v35 incluidas en esta versión.':(e.message||'No se pudo abrir la jornada')}
    }
  }

  async function closeCash(real){
    real=Number(real);
    if(!Number.isFinite(real)||real<0||real>1e9)return{ok:false,error:'Efectivo real inválido'};
    const u=state.currentUser,c=getOpenCash(u?.id);
    if(!c)return{ok:false,error:'No hay una jornada abierta'};
    const jornada=getOpenJourney(u.id)||await ensureJourneyForOpenCash(c);
    if(!jornada)return{ok:false,error:'No se pudo cargar la jornada activa'};
    try{
      const [loadedSales,loadedExpenses,loadedCashMovements]=await Promise.all([
        loadSalesForCash(c.id,{force:true}),
        loadExpensesForJourney(jornada.id,{force:true}),
        loadCashMovementsForJourney(jornada.id,{force:true})
      ]);
      if(!loadedSales.ok)throw Error(loadedSales.error||'No se pudieron cargar las ventas de esta jornada');
      if(!loadedExpenses.ok)throw Error('Cierre bloqueado: no se pudieron verificar todos los gastos: '+(loadedExpenses.error||''));
      if(!loadedCashMovements.ok)throw Error('Cierre bloqueado: no se pudieron verificar todos los movimientos de caja: '+(loadedCashMovements.error||''));
      const ventas=state.sales.filter(s=>s.empleadoId===u.id&&s.cajaId===c.id&&s.estado!=='Anulada');
      const gastos=state.expenses.filter(e=>(e.jornadaId===jornada.id||e.cajaId===c.id));
      const movCaja=state.cashMovements.filter(m=>m.jornadaId===jornada.id||m.cajaId===c.id);
      const pay=paymentTotals(ventas);
      const efectivo=pay.Efectivo,yape=pay.Yape,plin=pay.Plin,tarjeta=pay.Tarjeta;
      const totalVentas=+(efectivo+yape+plin+tarjeta).toFixed(2);
      const totalGastos=+gastos.reduce((a,e)=>a+Number(e.monto||0),0).toFixed(2);
      const gastosEfectivo=+gastos.filter(e=>String(e.metodoPago||'Otro')==='Efectivo').reduce((a,e)=>a+Number(e.monto||0),0).toFixed(2);
      const ingresosEfectivo=+movCaja.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+Number(m.monto||0),0).toFixed(2);
      const retirosEfectivo=+movCaja.filter(m=>m.tipo==='Retiro').reduce((a,m)=>a+Number(m.monto||0),0).toFixed(2);
      const esperado=+(Number(c.montoInicial||0)+efectivo+ingresosEfectivo-retirosEfectivo-gastosEfectivo).toFixed(2);
      const dif=+(real-esperado).toFixed(2),t=limaParts();
      const duracionMinutos=journeyDurationMinutes(jornada,t);
      const ref=db.collection('cashSessions').doc(c.id), journeyRef=db.collection('jornadas').doc(jornada.id), lockRef=db.collection('cashLocks').doc(u.id);
      const closeSummary={
        estado:'Cerrada',fechaCierre:t.fecha,horaCierre:t.hora,totalVentasDia:totalVentas,cantidadVentasDia:ventas.length,
        efectivoVentas:+efectivo.toFixed(2),yapeVentas:+yape.toFixed(2),plinVentas:+plin.toFixed(2),tarjetaVentas:+tarjeta.toFixed(2),
        ingresosEfectivo,retirosEfectivo,gastosEfectivo,esperado:+esperado.toFixed(2),real:+real.toFixed(2),diferencia:+dif.toFixed(2),closedAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      const employeeMap=new Map();
      ventas.forEach(v=>{if(v.empleadoId)employeeMap.set(v.empleadoId,v.empleadoNombre||`${u.nombres||''} ${u.apellidos||''}`.trim())});
      if(!employeeMap.size)employeeMap.set(u.id,`${u.nombres||''} ${u.apellidos||''}`.trim());
      const journeySummary={
        estado:'Cerrada',fechaCierre:t.fecha,horaCierre:t.hora,duracionMinutos,
        totalVentas,cantidadVentas:ventas.length,totalGastos,
        efectivoVentas:+efectivo.toFixed(2),yapeVentas:+yape.toFixed(2),plinVentas:+plin.toFixed(2),tarjetaVentas:+tarjeta.toFixed(2),
        ingresosEfectivo,retirosEfectivo,gastosEfectivo,efectivoEsperado:+esperado.toFixed(2),efectivoReal:+real.toFixed(2),diferencia:+dif.toFixed(2),
        empleadoIds:[...employeeMap.keys()],empleadoNombres:[...employeeMap.values()],
        closedAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.runTransaction(async tx=>{
        const [snap,jSnap,lockSnap]=await Promise.all([tx.get(ref),tx.get(journeyRef),tx.get(lockRef)]);
        if(!snap.exists||snap.data().estado!=='Abierta')throw Error('La caja de esta jornada ya no está abierta');
        if(!jSnap.exists||jSnap.data().estado!=='Abierta')throw Error('La jornada ya no está abierta');
        if(!lockSnap.exists||lockSnap.data().cajaId!==c.id||lockSnap.data().estado!=='Abierta')throw Error('El bloqueo de caja no coincide; se canceló el cierre por seguridad');
        tx.update(ref,closeSummary);
        tx.update(journeyRef,journeySummary);
        tx.delete(lockRef);
      });
      const local=state.cashSessions.find(x=>x.id===c.id);if(local)Object.assign(local,closeSummary,{closedAt:new Date()});
      const localJ=state.jornadas.find(x=>x.id===jornada.id);if(localJ)Object.assign(localJ,journeySummary,{closedAt:new Date()});
      validatedCashId=null;
      await safeAudit('CERRAR_JORNADA',`${jornada.numero||journeyNumber(jornada.id)} · Ventas S/${totalVentas.toFixed(2)} · Gastos S/${totalGastos.toFixed(2)} · Diferencia S/${dif.toFixed(2)}`);
      return{ok:true,diferencia:dif,totalVentasDia:totalVentas,totalGastos,duracionMinutos,jornadaId:jornada.id};
    }catch(e){return{ok:false,error:e.message||'No se pudo cerrar la jornada'}}
  }


  // ===== REINICIO TOTAL DEL SISTEMA v32 =====
  // Ya no existe una clave fija en el código. Antes de borrar se reautentica al
  // administrador con su contraseña real de Firebase Authentication.

  async function purgeCollection(name, preserveId = null) {
    let deleted = 0;
    // Batches de 400 para mantenernos por debajo del máximo de 500 operaciones de Firestore.
    for (let round = 0; round < 1000; round++) {
      const snap = await db.collection(name).limit(400).get();
      if (snap.empty) break;
      const targets = snap.docs.filter(d => !preserveId || d.id !== preserveId);
      if (!targets.length) break;
      const batch = db.batch();
      targets.forEach(d => batch.delete(d.ref));
      await batch.commit();
      deleted += targets.length;
      if (snap.size < 400) break;
    }
    return deleted;
  }

  async function resetSystem(password) {
    const u = state.currentUser;
    if (!u || u.role !== 'admin' || !isActive(u)) return {ok:false,error:'Solo el administrador puede reiniciar el sistema'};
    const authUser=fbAuth.currentUser;
    if(!authUser||authUser.uid!==u.id||!authUser.email)return{ok:false,error:'No se pudo validar la sesión del administrador'};
    const pass=String(password||'');
    if(!pass)return{ok:false,error:'Ingresa tu contraseña actual'};
    try{
      const credential=firebase.auth.EmailAuthProvider.credential(authUser.email,pass);
      await authUser.reauthenticateWithCredential(credential);
    }catch(e){
      return{ok:false,error:'La contraseña actual del administrador es incorrecta'};
    }

    const adminId = u.id;
    const counts = {};
    // Detener listeners evita que la interfaz se repinte doc por doc durante el borrado.
    stop();
    try {
      const collections = [
        'cashLocks','cashSessions','jornadas','cashMovements','sales','expenses','movements',
        'products','deletedProducts','categories','deletedCategories','audits','deletedExpenses','expenseRevisions'
      ];
      for (const name of collections) counts[name] = await purgeCollection(name);
      // Conservar únicamente el perfil del administrador conectado para no perder el acceso.
      counts.users = await purgeCollection('users', adminId);

      state.users = [u];
      state.categories = [];
      state.products = [];
      state.sales = [];
      state.movements = [];
      state.expenses = [];
      state.cashSessions = [];
      state.jornadas = [];
      state.cashMovements = [];
      state.audits = [];
      state.cart = [];
      validatedCashId = null;
      Object.keys(loadedAt).forEach(k => delete loadedAt[k]);
      coreLoadedFor = null;

      // Quitar restos del antiguo medidor local de v29, si existieran.
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('px_firestore_usage_')) localStorage.removeItem(key);
        }
      } catch (_) {}

      await loadData();
      return {ok:true,counts,employeeProfilesDeleted:counts.users || 0};
    } catch (e) {
      console.error('Reinicio del sistema:', e);
      // Intentar recuperar listeners aun si una colección falló a mitad del proceso.
      try { coreLoadedFor = null; await loadData(); } catch (_) {}
      return {ok:false,error:e?.code==='permission-denied'
        ? 'Firestore rechazó el reinicio. Publica las reglas v31 antes de usar esta función.'
        : (e.message || 'No se pudo reiniciar completamente el sistema')};
    }
  }

  return {state,load,login,logout,getCategory,getProduct,getUser,stockStatus,lowStockProducts,addUser:(...a)=>guarded('addUser',()=>addUser(...a)),updateUser:(...a)=>guarded('updateUser:'+a[0],()=>updateUser(...a)),sendPasswordReset:(...a)=>guarded('resetPassword:'+a[0],()=>sendPasswordReset(...a)),deleteUser:(...a)=>guarded('deleteUser:'+a[0],()=>deleteUser(...a)),addCategory:(...a)=>guarded('addCategory',()=>addCategory(...a)),updateCategory:(...a)=>guarded('updateCategory:'+a[0],()=>updateCategory(...a)),deleteCategory:(...a)=>guarded('deleteCategory:'+a[0],()=>deleteCategory(...a)),addProduct:(...a)=>guarded('addProduct',()=>addProduct(...a)),updateProduct:(...a)=>guarded('updateProduct:'+a[0],()=>updateProduct(...a)),deleteProduct:(...a)=>guarded('deleteProduct:'+a[0],()=>deleteProduct(...a)),addMovement:(...a)=>guarded('movement:'+a[0]?.productoId,()=>addMovement(...a)),addToCart,updateCartQty,removeFromCart,clearCart,getCartTotal,confirmSale:(...a)=>guarded('sale',()=>confirmSale(...a)),cancelSale:(...a)=>guarded('cancelSale:'+a[0],()=>cancelSale(...a)),addExpense:(...a)=>guarded('expense',()=>addExpense(...a)),today,salesToday,expensesToday,totalSales,totalExpenses,openCash:(...a)=>guarded('openCash',()=>openCash(...a)),closeCash:(...a)=>guarded('closeCash',()=>closeCash(...a)),preparePage,refreshDailyContext,loadSalesForDate,loadSalesForRange,loadSalesForCash,loadExpensesForRange,loadMovementsForRange,loadJourneyHistory,loadExpensesForJourney,loadMovementsForJourney,loadCashMovementsForJourney,loadJourneyDetail,daysAgo,getSalePayments,paymentTotals,salePaymentLabel,getOpenJourney,getOpenCash,journeyDurationMinutes,journeyNumber,addCashMovement:(...a)=>guarded('cashMovement',()=>addCashMovement(...a)),updateExpense:(...a)=>guarded('updateExpense:'+a[0],()=>updateExpense(...a)),deleteExpense:(...a)=>guarded('deleteExpense:'+a[0],()=>deleteExpense(...a)),resetSystem:(...a)=>guarded('resetSystem',()=>resetSystem(...a)),audit};
})();
