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
  function listen(name, query=null){ refs[name]?.(); const source=query||db.collection(name); refs[name]=source.onSnapshot(s=>{state[name]=s.docs.map(d=>name==='users'?normalizeUser({id:d.id,...d.data()}):({id:d.id,...d.data()})); if(Auth?.isLoggedIn?.() && Router?.current) Router.go(Router.current);},err=>{console.error('Firestore '+name+':',err); try{Toast.show('Error cargando '+name+': '+(err.message||err),'error')}catch(_){}}); }
  async function loadData(){
    if(state.currentUser?.role==='admin'){ for(const n of ['users','categories','products','sales','movements','expenses','cashSessions']) listen(n); return; }
    listen('categories'); listen('products');
    listen('sales',db.collection('sales').where('empleadoId','==',state.currentUser.id));
    listen('cashSessions',db.collection('cashSessions').where('usuarioId','==',state.currentUser.id));
  }
  function stop(){Object.values(refs).forEach(f=>f&&f()); Object.keys(refs).forEach(k=>delete refs[k]);}
  async function load(){ return new Promise(resolve=>fbAuth.onAuthStateChanged(async u=>{ if(!u){state.currentUser=null;stop();resolve();return;} const d=await db.collection('users').doc(u.uid).get(); if(!d.exists){await fbAuth.signOut();resolve();return;} state.currentUser=normalizeUser({id:u.uid,...d.data()}); if(!isActive(state.currentUser)){await fbAuth.signOut();state.currentUser=null;resolve();return;} await loadData(); resolve(); })); }
  async function login(email,password){try{const c=await fbAuth.signInWithEmailAndPassword(email,password);const d=await db.collection('users').doc(c.user.uid).get();if(!d.exists||!isActive(d.data())){await fbAuth.signOut();return{ok:false,error:'Usuario inactivo o sin perfil'}}state.currentUser=normalizeUser({id:c.user.uid,...d.data()});await loadData();return{ok:true,user:state.currentUser}}catch(e){return{ok:false,error:'Correo o contraseña incorrectos'}}}
  async function logout(){stop();state.cart=[];state.currentUser=null;await fbAuth.signOut()}
  async function audit(accion,detalle){if(!state.currentUser)return;const t=limaParts();await db.collection('audits').add({...t,accion,detalle,usuarioId:state.currentUser.id,usuarioNombre:`${state.currentUser.nombres||''} ${state.currentUser.apellidos||''}`.trim(),createdAt:firebase.firestore.FieldValue.serverTimestamp()})}
  async function addUser(data){try{const secondary=firebase.initializeApp(firebaseConfig,'userCreator-'+Date.now());const cred=await secondary.auth().createUserWithEmailAndPassword(data.email.trim().toLowerCase(),data.password);const user={email:data.email.trim().toLowerCase(),role:'empleado',nombres:data.nombres.trim(),apellidos:data.apellidos.trim(),dni:data.dni.trim(),telefono:data.telefono.trim(),estado:data.estado||'Activo'};await db.collection('users').doc(cred.user.uid).set(user);await secondary.auth().signOut();await secondary.delete();await audit('CREAR_EMPLEADO',user.email);return{ok:true,user:{id:cred.user.uid,...user}}}catch(e){return{ok:false,error:e.message}}}
  async function updateUser(id,data){try{const u=getUser(id);if(!u)return{ok:false,error:'Usuario no encontrado'};const patch={nombres:data.nombres?.trim()??u.nombres,apellidos:data.apellidos?.trim()??u.apellidos,dni:data.dni?.trim()??u.dni,telefono:data.telefono?.trim()??u.telefono,estado:data.estado??u.estado};await db.collection('users').doc(id).update(patch);await audit('EDITAR_EMPLEADO',id);return{ok:true}}catch(e){return{ok:false,error:e.message}}}
  async function deleteUser(id){if(id===state.currentUser?.id)return{ok:false,error:'No puedes desactivar tu propia cuenta'};await db.collection('users').doc(id).update({estado:'Inactivo'});await audit('DESACTIVAR_EMPLEADO',id);return{ok:true}}
  async function addCategory(nombre){const id=docId(),c={nombre:nombre.trim(),estado:'Activo'};await db.collection('categories').doc(id).set(c);await audit('CREAR_CATEGORIA',c.nombre);return{ok:true,category:{id,...c}}}
  async function updateCategory(id,data){await db.collection('categories').doc(id).update(clean(data));await audit('EDITAR_CATEGORIA',id);return{ok:true}}
  async function deleteCategory(id){if(state.products.some(p=>p.categoriaId===id&&p.estado==='Activo'))return{ok:false,error:'La categoría tiene productos activos asociados'};await db.collection('categories').doc(id).update({estado:'Inactivo'});return{ok:true}}
  async function addProduct(data){const id=docId(),stock=Number(data.stock)||0,t=limaParts();const p={nombre:data.nombre.trim(),categoriaId:data.categoriaId,precioCompra:Number(data.precioCompra),precioVenta:Number(data.precioVenta),stock,stockMinimo:Number(data.stockMinimo)||0,descripcion:(data.descripcion||'').trim(),imagen:data.imagen||'📦',estado:data.estado||'Activo'};const b=db.batch();b.set(db.collection('products').doc(id),p);if(stock>0){const mid=docId();b.set(db.collection('movements').doc(mid),{...t,productoId:id,productoNombre:p.nombre,tipo:'Entrada',cantidad:stock,stockAnterior:0,stockNuevo:stock,usuarioId:state.currentUser.id,motivo:'Stock inicial'});if(p.precioCompra>0)b.set(db.collection('expenses').doc(),{...t,concepto:`Stock inicial: ${p.nombre}`,categoria:'Stock',monto:+(stock*p.precioCompra).toFixed(2),origen:'Stock inicial',usuarioId:state.currentUser.id});}await b.commit();await audit('CREAR_PRODUCTO',p.nombre);return{ok:true,product:{id,...p}}}
  async function updateProduct(id,data){const p=getProduct(id);if(!p)return{ok:false,error:'Producto no encontrado'};const patch={nombre:data.nombre?.trim()??p.nombre,categoriaId:data.categoriaId??p.categoriaId,precioCompra:Number(data.precioCompra??p.precioCompra),precioVenta:Number(data.precioVenta??p.precioVenta),stockMinimo:Number(data.stockMinimo??p.stockMinimo),descripcion:data.descripcion?.trim()??p.descripcion,imagen:data.imagen||p.imagen,estado:data.estado||p.estado};await db.collection('products').doc(id).update(patch);await audit('EDITAR_PRODUCTO',p.nombre);return{ok:true}}
  async function deleteProduct(id){await db.collection('products').doc(id).update({estado:'Inactivo'});await audit('DESACTIVAR_PRODUCTO',id);return{ok:true}}
  async function addMovement({productoId,tipo,cantidad,costoUnitario,motivo}){cantidad=Number(cantidad);if(cantidad<=0)return{ok:false,error:'Cantidad inválida'};const pr=db.collection('products').doc(productoId);try{await db.runTransaction(async tx=>{const s=await tx.get(pr);if(!s.exists)throw Error('Producto no encontrado');const p=s.data(),old=Number(p.stock)||0;const negative=['Salida','Merma','Ajuste -'].includes(tipo);const neu=negative?old-cantidad:old+cantidad;if(neu<0)throw Error('Stock insuficiente');const t=limaParts(),m={...t,productoId,productoNombre:p.nombre,tipo,cantidad,stockAnterior:old,stockNuevo:neu,usuarioId:state.currentUser.id,motivo:motivo||''};tx.update(pr,{stock:neu,...(tipo==='Entrada'&&Number(costoUnitario)>0?{precioCompra:Number(costoUnitario)}:{})});tx.set(db.collection('movements').doc(),m);if(tipo==='Entrada'&&Number(costoUnitario)>0)tx.set(db.collection('expenses').doc(),{...t,concepto:`Compra de stock: ${p.nombre}`,categoria:'Stock',monto:+(cantidad*Number(costoUnitario)).toFixed(2),origen:'Compra de stock',usuarioId:state.currentUser.id});});await audit('MOVIMIENTO_STOCK',`${tipo} ${productoId} x${cantidad}`);return{ok:true}}catch(e){return{ok:false,error:e.message}}}
  function addToCart(productoId,qty=1){const p=getProduct(productoId);if(!p||p.estado!=='Activo'||p.stock<=0)return{ok:false,error:'Producto no disponible'};const i=state.cart.find(x=>x.productoId===productoId),n=(i?.cantidad||0)+qty;if(n>p.stock)return{ok:false,error:`Stock insuficiente (disponible: ${p.stock})`};i?i.cantidad=n:state.cart.push({productoId,cantidad:qty});return{ok:true}}
  function updateCartQty(id,c){const p=getProduct(id);if(!p)return{ok:false};if(c<=0)state.cart=state.cart.filter(x=>x.productoId!==id);else{if(c>p.stock)return{ok:false,error:`Máximo ${p.stock} unidades`};const i=state.cart.find(x=>x.productoId===id);if(i)i.cantidad=c;}return{ok:true}}
  function removeFromCart(id){state.cart=state.cart.filter(x=>x.productoId!==id)} function clearCart(){state.cart=[]}
  function getCartTotal(){return state.cart.reduce((s,i)=>s+(getProduct(i.productoId)?.precioVenta||0)*i.cantidad,0)}
  async function confirmSale(metodoPago){if(!state.cart.length)return{ok:false,error:'Carrito vacío'};if(!['Efectivo','Yape','Plin','Tarjeta'].includes(metodoPago))return{ok:false,error:'Método de pago inválido'};const hoy=today();const caja=state.cashSessions.find(x=>x.usuarioId===state.currentUser.id&&x.estado==='Abierta'&&x.fecha===hoy);if(!caja)return{ok:false,error:'Debes abrir la caja de hoy antes de registrar una venta'};const saleRef=db.collection('sales').doc();try{await db.runTransaction(async tx=>{const snaps=[];for(const i of state.cart)snaps.push([i,await tx.get(db.collection('products').doc(i.productoId))]);const items=[];let total=0,costo=0;for(const [i,s] of snaps){if(!s.exists||s.data().stock<i.cantidad)throw Error(`Stock insuficiente para ${s.data()?.nombre||'producto'}`);const p=s.data(),sub=p.precioVenta*i.cantidad;items.push({productoId:s.id,nombre:p.nombre,cantidad:i.cantidad,precioUnitario:p.precioVenta,costoUnitario:p.precioCompra,subtotal:sub});total+=sub;costo+=p.precioCompra*i.cantidad;tx.update(s.ref,{stock:p.stock-i.cantidad});const t=limaParts();tx.set(db.collection('movements').doc(),{...t,productoId:s.id,productoNombre:p.nombre,tipo:'Venta',cantidad:i.cantidad,stockAnterior:p.stock,stockNuevo:p.stock-i.cantidad,usuarioId:state.currentUser.id,motivo:`Venta ${saleRef.id}`});}const t=limaParts();tx.set(saleRef,{...t,numero:`V-${saleRef.id.slice(0,6).toUpperCase()}`,empleadoId:state.currentUser.id,empleadoNombre:`${state.currentUser.nombres} ${state.currentUser.apellidos}`,cajaId:caja.id,items,total:+total.toFixed(2),costoTotal:+costo.toFixed(2),metodoPago,estado:'Completada',createdAt:firebase.firestore.FieldValue.serverTimestamp()});});state.cart=[];await audit('VENTA',saleRef.id);return{ok:true,sale:{id:saleRef.id,numero:`V-${saleRef.id.slice(0,6).toUpperCase()}`,metodoPago}}}catch(e){return{ok:false,error:e.message}}}
  async function cancelSale(id,motivo='Sin motivo'){
    motivo=String(motivo||'').trim(); if(!motivo)return{ok:false,error:'Debes indicar el motivo de anulación'};
    if(state.currentUser?.role!=='admin')return{ok:false,error:'Solo el administrador puede anular ventas'};
    try{
      const sr=db.collection('sales').doc(id);
      await db.runTransaction(async tx=>{
        // Firestore exige hacer TODAS las lecturas antes de la primera escritura.
        const ss=await tx.get(sr); if(!ss.exists)throw Error('Venta no encontrada');
        const sale=ss.data(); if(sale.estado==='Anulada')throw Error('La venta ya está anulada');
        if(sale.estado!=='Completada')throw Error('La venta no se encuentra en un estado que pueda anularse');

        let cashSnap=null;
        if(sale.cajaId){
          cashSnap=await tx.get(db.collection('cashSessions').doc(sale.cajaId));
          if(cashSnap.exists&&cashSnap.data().estado==='Cerrada')throw Error('No se puede anular una venta de una caja ya cerrada');
        }

        const items=Array.isArray(sale.items)?sale.items:[];
        if(!items.length)throw Error('La venta no contiene productos para devolver');
        const productReads=[];
        for(const i of items){
          if(!i.productoId)throw Error('La venta contiene un producto inválido');
          const ref=db.collection('products').doc(i.productoId);
          const snap=await tx.get(ref);
          if(!snap.exists)throw Error(`Producto no encontrado: ${i.nombre||i.productoId}`);
          const qty=Number(i.cantidad||0);
          if(!Number.isFinite(qty)||qty<=0)throw Error(`Cantidad inválida en ${i.nombre||'producto'}`);
          productReads.push({item:i,ref,snap,qty});
        }

        // Solo después de terminar todas las lecturas se realizan las escrituras.
        const t=limaParts();
        for(const x of productReads){
          const old=Number(x.snap.data().stock||0), neu=old+x.qty;
          tx.update(x.ref,{stock:neu});
          tx.set(db.collection('movements').doc(),{...t,productoId:x.item.productoId,productoNombre:x.item.nombre||x.snap.data().nombre||'',tipo:'Devolución',cantidad:x.qty,stockAnterior:old,stockNuevo:neu,usuarioId:state.currentUser.id,motivo:`Anulación ${id}: ${motivo}`});
        }
        tx.update(sr,{estado:'Anulada',motivoAnulacion:motivo,anuladaPor:state.currentUser.id,fechaAnulacion:t.fecha,horaAnulacion:t.hora});
      });
      await audit('ANULAR_VENTA',`${id}: ${motivo}`);
      return{ok:true};
    }catch(e){
      console.error('Error anulando venta:',e);
      return{ok:false,error:e?.code==='permission-denied'?'Firestore rechazó la anulación. Verifica que las reglas de esta versión estén publicadas.':(e.message||'No se pudo anular la venta')};
    }
  }

  function today(){return limaParts().fecha} function salesToday(){return state.sales.filter(s=>s.fecha===today()&&s.estado!=='Anulada')} function expensesToday(){return state.expenses.filter(e=>e.fecha===today())} function totalSales(fn){return (fn?state.sales.filter(fn):state.sales).filter(s=>s.estado!=='Anulada').reduce((a,b)=>a+Number(b.total||0),0)} function totalExpenses(fn){return(fn?state.expenses.filter(fn):state.expenses).reduce((a,b)=>a+Number(b.monto||0),0)}
  async function openCash(initial){
    initial=Number(initial);
    if(!Number.isFinite(initial)||initial<0)return{ok:false,error:'Monto inicial inválido'};
    const u=state.currentUser,t=limaParts();
    if(!u)return{ok:false,error:'Sesión no válida'};
    if(state.cashSessions.some(x=>x.usuarioId===u.id&&x.estado==='Abierta'))return{ok:false,error:'Ya tienes una caja abierta'};
    // Se permiten varios turnos en un mismo día, pero nunca más de una caja abierta por usuario.
    // Usamos un ID nuevo por apertura; el botón se bloquea mientras se procesa para evitar doble clic.
    const ref=db.collection('cashSessions').doc(), cashId=ref.id;
    try{
      // Creación directa: funciona igual para Administrador y Empleado.
      // Una caja cerrada queda como historial y una nueva apertura crea un turno nuevo.
      const payload={...t,usuarioId:u.id,usuarioNombre:`${u.nombres||''} ${u.apellidos||''}`.trim(),montoInicial:+initial.toFixed(2),estado:'Abierta',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
      await ref.set(payload);
      if(!state.cashSessions.some(x=>x.id===cashId))state.cashSessions.push({id:cashId,...t,usuarioId:u.id,usuarioNombre:payload.usuarioNombre,montoInicial:+initial.toFixed(2),estado:'Abierta'});
      try{await audit('ABRIR_CAJA',`S/${initial.toFixed(2)}`);}catch(err){console.warn('Auditoría de apertura:',err);}
      return{ok:true,id:cashId};
    }catch(e){
      return{ok:false,error:e?.code==='permission-denied'?'No se pudo abrir la caja. Verifica que hayas publicado las reglas Firestore incluidas en esta versión.':(e.message||'No se pudo abrir la caja')}
    }
  }
  async function closeCash(real){
    real=Number(real);
    if(!Number.isFinite(real)||real<0)return{ok:false,error:'Efectivo real inválido'};
    const u=state.currentUser,c=state.cashSessions.find(x=>x.usuarioId===u.id&&x.estado==='Abierta');
    if(!c)return{ok:false,error:'No hay caja abierta'};
    try{
      // Se consulta Firestore directamente: el cierre no depende de que el listener local ya se haya actualizado.
      const qs=await db.collection('sales').where('empleadoId','==',u.id).where('cajaId','==',c.id).get();
      const ventas=qs.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.estado!=='Anulada');
      const sum=m=>ventas.filter(s=>String(s.metodoPago||'').trim().toLowerCase()===m.toLowerCase()).reduce((a,b)=>a+Number(b.total||0),0);
      const efectivo=sum('Efectivo'),yape=sum('Yape'),plin=sum('Plin'),tarjeta=sum('Tarjeta');
      const totalVentasDia=efectivo+yape+plin+tarjeta,esperado=Number(c.montoInicial||0)+efectivo,dif=real-esperado,t=limaParts();
      const ref=db.collection('cashSessions').doc(c.id);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);
        if(!snap.exists||snap.data().estado!=='Abierta')throw Error('La caja ya no está abierta');
        tx.update(ref,{estado:'Cerrada',fechaCierre:t.fecha,horaCierre:t.hora,totalVentasDia:+totalVentasDia.toFixed(2),cantidadVentasDia:ventas.length,efectivoVentas:+efectivo.toFixed(2),yapeVentas:+yape.toFixed(2),plinVentas:+plin.toFixed(2),tarjetaVentas:+tarjeta.toFixed(2),esperado:+esperado.toFixed(2),real:+real.toFixed(2),diferencia:+dif.toFixed(2),closedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      const local=state.cashSessions.find(x=>x.id===c.id);if(local)Object.assign(local,{estado:'Cerrada',fechaCierre:t.fecha,horaCierre:t.hora,totalVentasDia:+totalVentasDia.toFixed(2),cantidadVentasDia:ventas.length,efectivoVentas:+efectivo.toFixed(2),yapeVentas:+yape.toFixed(2),plinVentas:+plin.toFixed(2),tarjetaVentas:+tarjeta.toFixed(2),esperado:+esperado.toFixed(2),real:+real.toFixed(2),diferencia:+dif.toFixed(2)});
      await audit('CERRAR_CAJA',`Ventas día S/${totalVentasDia.toFixed(2)} · Diferencia efectivo S/${dif.toFixed(2)}`);
      return{ok:true,diferencia:dif,totalVentasDia};
    }catch(e){return{ok:false,error:e.message||'No se pudo cerrar la caja'}}
  }
  return {state,load,login,logout,getCategory,getProduct,getUser,stockStatus,lowStockProducts,addUser:(...a)=>guarded('addUser',()=>addUser(...a)),updateUser:(...a)=>guarded('updateUser:'+a[0],()=>updateUser(...a)),deleteUser:(...a)=>guarded('deleteUser:'+a[0],()=>deleteUser(...a)),addCategory:(...a)=>guarded('addCategory',()=>addCategory(...a)),updateCategory:(...a)=>guarded('updateCategory:'+a[0],()=>updateCategory(...a)),deleteCategory:(...a)=>guarded('deleteCategory:'+a[0],()=>deleteCategory(...a)),addProduct:(...a)=>guarded('addProduct',()=>addProduct(...a)),updateProduct:(...a)=>guarded('updateProduct:'+a[0],()=>updateProduct(...a)),deleteProduct:(...a)=>guarded('deleteProduct:'+a[0],()=>deleteProduct(...a)),addMovement:(...a)=>guarded('movement:'+a[0]?.productoId,()=>addMovement(...a)),addToCart,updateCartQty,removeFromCart,clearCart,getCartTotal,confirmSale:(...a)=>guarded('sale',()=>confirmSale(...a)),cancelSale:(...a)=>guarded('cancelSale:'+a[0],()=>cancelSale(...a)),addExpense:(...a)=>guarded('expense',()=>addExpense(...a)),today,salesToday,expensesToday,totalSales,totalExpenses,openCash:(...a)=>guarded('openCash',()=>openCash(...a)),closeCash:(...a)=>guarded('closeCash',()=>closeCash(...a)),audit};
})();
