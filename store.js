/* ===== FIREBASE STORE ===== */
const Store = (() => {
  const state = { users:[], categories:[], products:[], sales:[], movements:[], expenses:[], cashSessions:[], audits:[], currentUser:null, cart:[] };
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
  let coreLoadedFor = null;
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
  async function fetchInto(name,source,{replace=false,cacheKey=null,ttl=300000}={}){
    const key=cacheKey||name; const now=Date.now();
    if(loadedAt[key] && now-loadedAt[key]<ttl) return {ok:true,cached:true};
    try{ const snap=await source.get(); const docs=normalizeDocs(name,snap); trackUsage('reads',Math.max(1,snap.size),docs); replace?replaceState(name,docs):mergeState(name,docs); loadedAt[key]=now; return{ok:true,count:docs.length}; }
    catch(e){ console.error('Carga '+name,e); return{ok:false,error:e.message}; }
  }
  function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(d); }
  function monthStart(){ return usageDate().slice(0,7)+'-01'; }
  async function loadData(){
    const u=state.currentUser, d=usageDate(); if(!u)return;
    if(coreLoadedFor===u.id && refs.productsLive && refs.todaySales && refs.openCash)return;
    coreLoadedFor=u.id;
    // Categorías cambian poco: una sola lectura por sesión, sin listener permanente.
    const cats=fetchInto('categories',db.collection('categories'),{replace:true,cacheKey:'categories',ttl:1800000});
    // Stock sí necesita tiempo real para evitar vender con una pantalla desactualizada.
    const products=listenScoped('productsLive','products',db.collection('products'),{replace:true});
    const saleQuery=u.role==='admin'?db.collection('sales').where('fecha','==',d):db.collection('sales').where('empleadoId','==',u.id).where('fecha','==',d);
    const sales=listenScoped('todaySales','sales',saleQuery,{predicate:x=>x.fecha===d&&(u.role==='admin'||x.empleadoId===u.id)});
    const cashQuery=db.collection('cashSessions').where('usuarioId','==',u.id).where('estado','==','Abierta');
    const cash=listenScoped('openCash','cashSessions',cashQuery,{predicate:x=>x.usuarioId===u.id&&x.estado==='Abierta'});
    const tasks=[cats,products,sales,cash];
    if(u.role==='admin') tasks.push(listenScoped('todayExpenses','expenses',db.collection('expenses').where('fecha','==',d),{predicate:x=>x.fecha===d}));
    await Promise.all(tasks);
  }
  async function loadUsers(){ return fetchInto('users',db.collection('users'),{replace:true,cacheKey:'users',ttl:900000}); }
  async function loadSalesHistory(){
    const u=state.currentUser; if(!u)return; const start=daysAgo(31);
    if(u.role==='admin') return fetchInto('sales',db.collection('sales').where('fecha','>=',start).orderBy('fecha','desc').limit(250),{cacheKey:'salesHistory',ttl:300000});
    // Para empleados consultamos por días: evita descargar años de ventas y no requiere índices complejos.
    if(loadedAt.salesHistory && Date.now()-loadedAt.salesHistory<300000)return{ok:true,cached:true};
    for(let i=0;i<14;i++){ const date=daysAgo(i); await fetchInto('sales',db.collection('sales').where('empleadoId','==',u.id).where('fecha','==',date),{cacheKey:'empSales:'+date,ttl:300000}); }
    loadedAt.salesHistory=Date.now(); return{ok:true};
  }
  async function loadSalesForDate(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return{ok:false,error:'Fecha inválida'};
    const u=state.currentUser; let q=db.collection('sales').where('fecha','==',date); if(u?.role!=='admin')q=q.where('empleadoId','==',u.id);
    return fetchInto('sales',q,{cacheKey:'salesDate:'+date,ttl:600000});
  }
  async function loadExpensesHistory(){ return fetchInto('expenses',db.collection('expenses').where('fecha','>=',daysAgo(31)).orderBy('fecha','desc').limit(250),{cacheKey:'expensesHistory',ttl:300000}); }
  async function loadMovements(){ return fetchInto('movements',db.collection('movements').where('fecha','>=',daysAgo(31)).orderBy('fecha','desc').limit(250),{cacheKey:'movements',ttl:300000}); }
  async function loadCashHistory(){
    const u=state.currentUser; if(!u)return;
    if(u.role==='admin') return fetchInto('cashSessions',db.collection('cashSessions').where('fecha','>=',daysAgo(45)).orderBy('fecha','desc').limit(80),{cacheKey:'cashHistory',ttl:300000});
    if(loadedAt.cashHistory && Date.now()-loadedAt.cashHistory<300000)return{ok:true,cached:true};
    for(let i=0;i<14;i++){const date=daysAgo(i);await fetchInto('cashSessions',db.collection('cashSessions').where('usuarioId','==',u.id).where('fecha','==',date),{cacheKey:'cash:'+date,ttl:300000});}
    loadedAt.cashHistory=Date.now(); return{ok:true};
  }
  async function preparePage(page){
    if(!state.currentUser)return;
    if(['empleados','movimientos','gastos'].includes(page))await loadUsers();
    if(page==='empleados')return;
    if(page==='movimientos')await loadMovements();
    if(page==='gastos')await loadExpensesHistory();
    if(page==='historial')await Promise.all([loadSalesHistory(), state.currentUser.role==='admin'?loadUsers():Promise.resolve()]);
    if(page==='caja')await loadCashHistory();
    if(page==='reportes')await Promise.all([loadSalesHistory(),loadExpensesHistory()]);
  }
  let profilePromise=null, profileUid=null;
  async function loadProfile(uid){
    if(state.currentUser?.id===uid)return state.currentUser;
    if(profilePromise&&profileUid===uid)return profilePromise;
    profileUid=uid;
    profilePromise=(async()=>{const d=await db.collection('users').doc(uid).get();trackUsage('reads',1,d.exists?[{id:d.id,...d.data()}]:[]);return d.exists?normalizeUser({id:uid,...d.data()}):null;})();
    try{return await profilePromise;}finally{profilePromise=null;}
  }
  function stop(){Object.values(refs).forEach(f=>f&&f()); Object.keys(refs).forEach(k=>delete refs[k]); Object.keys(loadedAt).forEach(k=>delete loadedAt[k]); coreLoadedFor=null; validatedCashId=null;}
  async function load(){ return new Promise(resolve=>fbAuth.onAuthStateChanged(async u=>{ if(!u){state.currentUser=null;stop();resolve();return;} const profile=await loadProfile(u.uid); if(!profile){await fbAuth.signOut();resolve();return;} state.currentUser=profile; if(!isActive(state.currentUser)){await fbAuth.signOut();state.currentUser=null;resolve();return;} await loadData(); resolve(); })); }
  async function login(email,password){try{const c=await fbAuth.signInWithEmailAndPassword(email,password);const profile=await loadProfile(c.user.uid);if(!profile||!isActive(profile)){await fbAuth.signOut();return{ok:false,error:'Usuario inactivo o sin perfil'}}state.currentUser=profile;await loadData();return{ok:true,user:state.currentUser}}catch(e){return{ok:false,error:'Correo o contraseña incorrectos'}}}
  async function logout(){stop();state.cart=[];state.currentUser=null;await fbAuth.signOut()}
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
      const id=docId(),t=limaParts(),p=v.value,stock=p.stock;
      const b=db.batch();b.set(db.collection('products').doc(id),p);
      if(stock>0){
        const mid=docId();
        b.set(db.collection('movements').doc(mid),{...t,productoId:id,productoNombre:p.nombre,tipo:'Entrada',cantidad:stock,stockAnterior:0,stockNuevo:stock,usuarioId:state.currentUser.id,motivo:'Stock inicial'});
        if(p.precioCompra>0)b.set(db.collection('expenses').doc(),{...t,concepto:`Stock inicial: ${p.nombre}`,categoria:'Stock',monto:+(stock*p.precioCompra).toFixed(2),origen:'Stock inicial',usuarioId:state.currentUser.id});
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
        if(stockAlEliminar>0)tx.set(db.collection('movements').doc(),{...t,productoId:id,productoNombre:data.nombre||'',tipo:'Eliminación',cantidad:stockAlEliminar,stockAnterior:stockAlEliminar,stockNuevo:0,usuarioId:state.currentUser.id,motivo:'Producto eliminado del catálogo'});
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
    try{
      await db.runTransaction(async tx=>{
        const s=await tx.get(pr);if(!s.exists)throw Error('Producto no encontrado');
        const p=s.data(),old=Number(p.stock)||0;const negative=['Salida','Merma','Ajuste -'].includes(tipo);const neu=negative?old-cantidad:old+cantidad;
        if(neu<0)throw Error('Stock insuficiente');
        const t=limaParts(),m={...t,productoId,productoNombre:p.nombre,tipo,cantidad,stockAnterior:old,stockNuevo:neu,usuarioId:state.currentUser.id,motivo:String(motivo||'').trim()};
        tx.update(pr,{stock:neu,...(tipo==='Entrada'&&costoUnitario>0?{precioCompra:costoUnitario}:{})});
        tx.set(db.collection('movements').doc(),m);
        if(tipo==='Entrada'&&costoUnitario>0)tx.set(db.collection('expenses').doc(),{...t,concepto:`Compra de stock: ${p.nombre}`,categoria:'Stock',monto:+(cantidad*costoUnitario).toFixed(2),origen:'Compra de stock',usuarioId:state.currentUser.id});
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
        tx.set(lockRef,{usuarioId:u.id,cajaId:caja.id,estado:'Abierta',fecha:caja.fecha||today(),hora:caja.hora||limaParts().hora,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      trackUsage('reads',1);trackUsage('writes',1);validatedCashId=caja.id;return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo validar la caja activa'}}
  }
  async function confirmSale(metodoPago){
    const u=state.currentUser;
    if(!u||!isActive(u))return{ok:false,error:'Sesión no válida'};
    if(!state.cart.length)return{ok:false,error:'Carrito vacío'};
    if(state.cart.length>100)return{ok:false,error:'La venta excede el máximo de 100 productos distintos'};
    if(!['Efectivo','Yape','Plin','Tarjeta'].includes(metodoPago))return{ok:false,error:'Método de pago inválido'};
    for(const i of state.cart){
      if(!i?.productoId||!Number.isInteger(Number(i.cantidad))||Number(i.cantidad)<=0)return{ok:false,error:'El carrito contiene una cantidad inválida'};
    }
    const hoy=today();
    const caja=state.cashSessions.find(x=>x.usuarioId===u.id&&x.estado==='Abierta'&&x.fecha===hoy);
    if(!caja)return{ok:false,error:'Debes abrir la caja de hoy antes de registrar una venta'};
    const lock=await ensureCashLock(caja);if(!lock.ok)return lock;
    const saleRef=db.collection('sales').doc();
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
          tx.set(db.collection('movements').doc(),{...t,productoId:s.id,productoNombre:String(p.nombre||''),tipo:'Venta',cantidad:qty,stockAnterior:stock,stockNuevo:stock-qty,usuarioId:u.id,motivo:`Venta ${saleRef.id}`});
        }
        total=+total.toFixed(2);costo=+costo.toFixed(2);
        if(!Number.isFinite(total)||total<=0)throw Error('El total de la venta debe ser mayor a S/ 0.00');
        const t=limaParts();
        tx.set(saleRef,{...t,numero:`V-${saleRef.id.slice(0,6).toUpperCase()}`,empleadoId:u.id,empleadoNombre:`${u.nombres} ${u.apellidos}`.trim(),cajaId:caja.id,items,total,costoTotal:costo,metodoPago,estado:'Completada',createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      trackUsage('reads',state.cart.length);trackUsage('writes',1+state.cart.length*2);
      state.cart=[];await safeAudit('VENTA',saleRef.id);
      return{ok:true,sale:{id:saleRef.id,numero:`V-${saleRef.id.slice(0,6).toUpperCase()}`,metodoPago}};
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

        let cashRef=null,cashSnap=null;
        if(sale.cajaId){ cashRef=db.collection('cashSessions').doc(sale.cajaId); cashSnap=await tx.get(cashRef); }

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
            tx.set(db.collection('movements').doc(),{...t,productoId:x.item.productoId,productoNombre:x.item.nombre||x.snap.data().nombre||'',tipo:'Devolución',cantidad:x.qty,stockAnterior:old,stockNuevo:neu,usuarioId:state.currentUser.id,motivo:`Anulación ${id}: ${motivo}`});
          }else{
            // El producto fue eliminado del catálogo. La devolución se conserva en su archivo
            // para no revivirlo ni perder trazabilidad del stock histórico.
            const archived=x.archiveSnap.data(),old=Number(archived.stockDevueltoPorAnulaciones||0),neu=old+x.qty;
            tx.update(x.archiveRef,{stockDevueltoPorAnulaciones:neu,ultimaDevolucionFecha:t.fecha,ultimaDevolucionHora:t.hora,ultimaVentaAnuladaId:id});
            tx.set(db.collection('movements').doc(),{...t,productoId:x.item.productoId,productoNombre:x.item.nombre||archived.nombre||'',tipo:'Devolución',cantidad:x.qty,stockAnterior:old,stockNuevo:neu,productoEliminado:true,usuarioId:state.currentUser.id,motivo:`Anulación ${id}: ${motivo} · producto eliminado del catálogo`});
          }
        }

        // Si la caja ya fue cerrada, mantener su resumen contable consistente.
        if(cashSnap?.exists && cashSnap.data().estado==='Cerrada'){
          const c=cashSnap.data(), total=Number(sale.total||0), metodo=sale.metodoPago;
          const patch={
            totalVentasDia:+Math.max(0,Number(c.totalVentasDia||0)-total).toFixed(2),
            cantidadVentasDia:Math.max(0,Number(c.cantidadVentasDia||0)-1),
            ajustePorAnulacion:true,
            ultimaAnulacionId:id,
            ultimaAnulacionFecha:t.fecha,
            ultimaAnulacionHora:t.hora
          };
          const field={Efectivo:'efectivoVentas',Yape:'yapeVentas',Plin:'plinVentas',Tarjeta:'tarjetaVentas'}[metodo];
          if(field) patch[field]=+Math.max(0,Number(c[field]||0)-total).toFixed(2);
          if(metodo==='Efectivo'){
            patch.esperado=+Math.max(0,Number(c.esperado||0)-total).toFixed(2);
            patch.diferencia=+(Number(c.real||0)-patch.esperado).toFixed(2);
          }
          tx.update(cashRef,patch);
        }
        tx.update(sr,{estado:'Anulada',motivoAnulacion:motivo,anuladaPor:state.currentUser.id,fechaAnulacion:t.fecha,horaAnulacion:t.hora});
      });
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
    const t=limaParts();
    const payload={...t,concepto,categoria,monto:+monto.toFixed(2),origen:'Manual',usuarioId:u.id,usuarioNombre:`${u.nombres||''} ${u.apellidos||''}`.trim(),createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{
      const ref=await db.collection('expenses').add(payload);trackUsage('writes',1);
      if(!state.expenses.some(e=>e.id===ref.id))state.expenses.push({id:ref.id,...payload});
      try{await safeAudit('REGISTRAR_GASTO',`${concepto} · S/${monto.toFixed(2)}`)}catch(err){console.warn('Auditoría gasto:',err)}
      return{ok:true,id:ref.id};
    }catch(e){
      console.error('Error registrando gasto:',e);
      return{ok:false,error:e?.code==='permission-denied'?'Firestore no permitió registrar el gasto. Verifica que ingresaste como administrador y que las reglas estén publicadas.':(e.message||'No se pudo registrar el gasto')};
    }
  }

  function today(){return limaParts().fecha} function salesToday(){return state.sales.filter(s=>s.fecha===today()&&s.estado!=='Anulada')} function expensesToday(){return state.expenses.filter(e=>e.fecha===today())} function totalSales(fn){return (fn?state.sales.filter(fn):state.sales).filter(s=>s.estado!=='Anulada').reduce((a,b)=>a+Number(b.total||0),0)} function totalExpenses(fn){return(fn?state.expenses.filter(fn):state.expenses).reduce((a,b)=>a+Number(b.monto||0),0)}
  async function openCash(initial){
    initial=Number(initial);
    if(!Number.isFinite(initial)||initial<0)return{ok:false,error:'Monto inicial inválido'};
    const u=state.currentUser,t=limaParts();
    if(!u)return{ok:false,error:'Sesión no válida'};
    if(state.cashSessions.some(x=>x.usuarioId===u.id&&x.estado==='Abierta'))return{ok:false,error:'Ya tienes una caja abierta'};

    // El listener de caja abierta ya confirmó el estado actual sin releer el historial.

    const ref=db.collection('cashSessions').doc(), cashId=ref.id;
    const lockRef=db.collection('cashLocks').doc(u.id);
    const payload={...t,usuarioId:u.id,usuarioNombre:`${u.nombres||''} ${u.apellidos||''}`.trim(),montoInicial:+initial.toFixed(2),estado:'Abierta',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{
      // El documento cashLocks/{uid} serializa aperturas concurrentes entre pestañas/equipos.
      await db.runTransaction(async tx=>{
        const lockSnap=await tx.get(lockRef);
        let previousCashSnap=null;
        if(lockSnap.exists && lockSnap.data().cajaId){
          previousCashSnap=await tx.get(db.collection('cashSessions').doc(lockSnap.data().cajaId));
        }
        if(previousCashSnap?.exists && previousCashSnap.data().estado==='Abierta')throw Error('Ya tienes una caja abierta en otro dispositivo o pestaña');
        tx.set(ref,payload);
        tx.set(lockRef,{usuarioId:u.id,cajaId:cashId,estado:'Abierta',fecha:t.fecha,hora:t.hora,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      trackUsage('reads',1);trackUsage('writes',2);
      if(!state.cashSessions.some(x=>x.id===cashId))state.cashSessions.push({id:cashId,...t,usuarioId:u.id,usuarioNombre:payload.usuarioNombre,montoInicial:+initial.toFixed(2),estado:'Abierta'});
      validatedCashId=cashId;try{await safeAudit('ABRIR_CAJA',`S/${initial.toFixed(2)}`);}catch(err){console.warn('Auditoría de apertura:',err);}
      return{ok:true,id:cashId};
    }catch(e){
      return{ok:false,error:e?.code==='permission-denied'?'No se pudo abrir la caja. Publica las reglas Firestore incluidas en esta versión.':(e.message||'No se pudo abrir la caja')}
    }
  }
  async function closeCash(real){
    real=Number(real);
    if(!Number.isFinite(real)||real<0)return{ok:false,error:'Efectivo real inválido'};
    const u=state.currentUser,c=state.cashSessions.find(x=>x.usuarioId===u.id&&x.estado==='Abierta');
    if(!c)return{ok:false,error:'No hay caja abierta'};
    try{
      // La venta del día ya está sincronizada por el listener; reutilizarla evita releer toda la caja al cerrar.
      let ventas=state.sales.filter(s=>s.empleadoId===u.id&&s.cajaId===c.id&&s.estado!=='Anulada');
      if(!refs.todaySales || c.fecha!==today()){
        const qs=await db.collection('sales').where('empleadoId','==',u.id).where('cajaId','==',c.id).get();
        ventas=qs.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.estado!=='Anulada');
        trackUsage('reads',qs.size,ventas);
      }
      const sum=m=>ventas.filter(s=>String(s.metodoPago||'').trim().toLowerCase()===m.toLowerCase()).reduce((a,b)=>a+Number(b.total||0),0);
      const efectivo=sum('Efectivo'),yape=sum('Yape'),plin=sum('Plin'),tarjeta=sum('Tarjeta');
      const totalVentasDia=efectivo+yape+plin+tarjeta,esperado=Number(c.montoInicial||0)+efectivo,dif=real-esperado,t=limaParts();
      const ref=db.collection('cashSessions').doc(c.id), lockRef=db.collection('cashLocks').doc(u.id);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);
        const lockSnap=await tx.get(lockRef);
        if(!snap.exists||snap.data().estado!=='Abierta')throw Error('La caja ya no está abierta');
        tx.update(ref,{estado:'Cerrada',fechaCierre:t.fecha,horaCierre:t.hora,totalVentasDia:+totalVentasDia.toFixed(2),cantidadVentasDia:ventas.length,efectivoVentas:+efectivo.toFixed(2),yapeVentas:+yape.toFixed(2),plinVentas:+plin.toFixed(2),tarjetaVentas:+tarjeta.toFixed(2),esperado:+esperado.toFixed(2),real:+real.toFixed(2),diferencia:+dif.toFixed(2),closedAt:firebase.firestore.FieldValue.serverTimestamp()});
        if(lockSnap.exists && lockSnap.data().cajaId===c.id)tx.delete(lockRef);
      });trackUsage('reads',2);trackUsage('writes',1);trackUsage('deletes',1);
      const local=state.cashSessions.find(x=>x.id===c.id);if(local)Object.assign(local,{estado:'Cerrada',fechaCierre:t.fecha,horaCierre:t.hora,totalVentasDia:+totalVentasDia.toFixed(2),cantidadVentasDia:ventas.length,efectivoVentas:+efectivo.toFixed(2),yapeVentas:+yape.toFixed(2),plinVentas:+plin.toFixed(2),tarjetaVentas:+tarjeta.toFixed(2),esperado:+esperado.toFixed(2),real:+real.toFixed(2),diferencia:+dif.toFixed(2)});
      validatedCashId=null;await safeAudit('CERRAR_CAJA',`Ventas día S/${totalVentasDia.toFixed(2)} · Diferencia efectivo S/${dif.toFixed(2)}`);
      return{ok:true,diferencia:dif,totalVentasDia};
    }catch(e){return{ok:false,error:e.message||'No se pudo cerrar la caja'}}
  }

  // ===== REINICIO TOTAL DEL SISTEMA v31 =====
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
        'cashLocks','cashSessions','sales','expenses','movements',
        'products','deletedProducts','categories','deletedCategories','audits'
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

  return {state,load,login,logout,getCategory,getProduct,getUser,stockStatus,lowStockProducts,addUser:(...a)=>guarded('addUser',()=>addUser(...a)),updateUser:(...a)=>guarded('updateUser:'+a[0],()=>updateUser(...a)),sendPasswordReset:(...a)=>guarded('resetPassword:'+a[0],()=>sendPasswordReset(...a)),deleteUser:(...a)=>guarded('deleteUser:'+a[0],()=>deleteUser(...a)),addCategory:(...a)=>guarded('addCategory',()=>addCategory(...a)),updateCategory:(...a)=>guarded('updateCategory:'+a[0],()=>updateCategory(...a)),deleteCategory:(...a)=>guarded('deleteCategory:'+a[0],()=>deleteCategory(...a)),addProduct:(...a)=>guarded('addProduct',()=>addProduct(...a)),updateProduct:(...a)=>guarded('updateProduct:'+a[0],()=>updateProduct(...a)),deleteProduct:(...a)=>guarded('deleteProduct:'+a[0],()=>deleteProduct(...a)),addMovement:(...a)=>guarded('movement:'+a[0]?.productoId,()=>addMovement(...a)),addToCart,updateCartQty,removeFromCart,clearCart,getCartTotal,confirmSale:(...a)=>guarded('sale',()=>confirmSale(...a)),cancelSale:(...a)=>guarded('cancelSale:'+a[0],()=>cancelSale(...a)),addExpense:(...a)=>guarded('expense',()=>addExpense(...a)),today,salesToday,expensesToday,totalSales,totalExpenses,openCash:(...a)=>guarded('openCash',()=>openCash(...a)),closeCash:(...a)=>guarded('closeCash',()=>closeCash(...a)),preparePage,loadSalesForDate,resetSystem:(...a)=>guarded('resetSystem',()=>resetSystem(...a)),audit};
})();
