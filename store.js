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
  function listen(name, query=null){ refs[name]?.(); const source=query||db.collection(name); refs[name]=source.onSnapshot(s=>{state[name]=s.docs.map(d=>name==='users'?normalizeUser({id:d.id,...d.data()}):({id:d.id,...d.data()})); if(Auth?.isLoggedIn?.() && Router?.current) App?.requestRefresh?.();},err=>{console.error('Firestore '+name+':',err); try{Toast.show('Error cargando '+name+': '+(err.message||err),'error')}catch(_){}}); }
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
  async function addUser(data){
    const email=String(data?.email||'').trim().toLowerCase(), password=String(data?.password||'');
    if(!email)return{ok:false,error:'Ingresa un correo válido'};
    if(password.length<6)return{ok:false,error:'La contraseña debe tener al menos 6 caracteres'};
    let secondary=null;
    try{
      secondary=firebase.initializeApp(firebaseConfig,'userCreator-'+Date.now());
      const cred=await secondary.auth().createUserWithEmailAndPassword(email,password);
      const user={email,role:'empleado',nombres:String(data.nombres||'').trim(),apellidos:String(data.apellidos||'').trim(),dni:String(data.dni||'').trim(),telefono:String(data.telefono||'').trim(),estado:data.estado||'Activo'};
      await db.collection('users').doc(cred.user.uid).set(user);
      await audit('CREAR_EMPLEADO',user.email);
      return{ok:true,user:{id:cred.user.uid,...user}};
    }catch(e){return{ok:false,error:e.message}}
    finally{
      if(secondary){try{await secondary.auth().signOut()}catch(_){} try{await secondary.delete()}catch(_){}}
    }
  }
  async function updateUser(id,data){try{const u=getUser(id);if(!u)return{ok:false,error:'Usuario no encontrado'};const patch={nombres:data.nombres?.trim()??u.nombres,apellidos:data.apellidos?.trim()??u.apellidos,dni:data.dni?.trim()??u.dni,telefono:data.telefono?.trim()??u.telefono,estado:data.estado??u.estado};await db.collection('users').doc(id).update(patch);await audit('EDITAR_EMPLEADO',id);return{ok:true}}catch(e){return{ok:false,error:e.message}}}
  async function sendPasswordReset(id){
    try{
      const u=getUser(id); if(!u?.email)return{ok:false,error:'El empleado no tiene un correo válido'};
      await fbAuth.sendPasswordResetEmail(u.email);
      await audit('RESTABLECER_CLAVE_EMPLEADO',id);
      return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo enviar el enlace de restablecimiento'}}
  }
  async function deleteUser(id){try{if(id===state.currentUser?.id)return{ok:false,error:'No puedes desactivar tu propia cuenta'};await db.collection('users').doc(id).update({estado:'Inactivo'});await audit('DESACTIVAR_EMPLEADO',id);return{ok:true}}catch(e){return{ok:false,error:e.message||'No se pudo desactivar el empleado'}}}
  async function addCategory(nombre){const id=docId(),c={nombre:nombre.trim(),estado:'Activo'};await db.collection('categories').doc(id).set(c);await audit('CREAR_CATEGORIA',c.nombre);return{ok:true,category:{id,...c}}}
  async function updateCategory(id,data){await db.collection('categories').doc(id).update(clean(data));await audit('EDITAR_CATEGORIA',id);return{ok:true}}
  async function deleteCategory(id){try{if(state.products.some(p=>p.categoriaId===id&&p.estado==='Activo'))return{ok:false,error:'La categoría tiene productos activos asociados'};await db.collection('categories').doc(id).update({estado:'Inactivo'});await audit('DESACTIVAR_CATEGORIA',id);return{ok:true}}catch(e){return{ok:false,error:e.message||'No se pudo desactivar la categoría'}}}
  async function addProduct(data){const id=docId(),stock=Number(data.stock)||0,t=limaParts();const p={nombre:data.nombre.trim(),categoriaId:data.categoriaId,precioCompra:Number(data.precioCompra),precioVenta:Number(data.precioVenta),stock,stockMinimo:Number(data.stockMinimo)||0,descripcion:(data.descripcion||'').trim(),imagen:data.imagen||'📦',estado:data.estado||'Activo'};const b=db.batch();b.set(db.collection('products').doc(id),p);if(stock>0){const mid=docId();b.set(db.collection('movements').doc(mid),{...t,productoId:id,productoNombre:p.nombre,tipo:'Entrada',cantidad:stock,stockAnterior:0,stockNuevo:stock,usuarioId:state.currentUser.id,motivo:'Stock inicial'});if(p.precioCompra>0)b.set(db.collection('expenses').doc(),{...t,concepto:`Stock inicial: ${p.nombre}`,categoria:'Stock',monto:+(stock*p.precioCompra).toFixed(2),origen:'Stock inicial',usuarioId:state.currentUser.id});}await b.commit();await audit('CREAR_PRODUCTO',p.nombre);return{ok:true,product:{id,...p}}}
  async function updateProduct(id,data){const p=getProduct(id);if(!p)return{ok:false,error:'Producto no encontrado'};const patch={nombre:data.nombre?.trim()??p.nombre,categoriaId:data.categoriaId??p.categoriaId,precioCompra:Number(data.precioCompra??p.precioCompra),precioVenta:Number(data.precioVenta??p.precioVenta),stockMinimo:Number(data.stockMinimo??p.stockMinimo),descripcion:data.descripcion?.trim()??p.descripcion,imagen:data.imagen||p.imagen,estado:data.estado||p.estado};await db.collection('products').doc(id).update(patch);await audit('EDITAR_PRODUCTO',p.nombre);return{ok:true}}
  async function deleteProduct(id){try{await db.collection('products').doc(id).update({estado:'Inactivo'});await audit('DESACTIVAR_PRODUCTO',id);return{ok:true}}catch(e){return{ok:false,error:e.message||'No se pudo desactivar el producto'}}}
  async function addMovement({productoId,tipo,cantidad,costoUnitario,motivo}){cantidad=Number(cantidad);if(cantidad<=0)return{ok:false,error:'Cantidad inválida'};const pr=db.collection('products').doc(productoId);try{await db.runTransaction(async tx=>{const s=await tx.get(pr);if(!s.exists)throw Error('Producto no encontrado');const p=s.data(),old=Number(p.stock)||0;const negative=['Salida','Merma','Ajuste -'].includes(tipo);const neu=negative?old-cantidad:old+cantidad;if(neu<0)throw Error('Stock insuficiente');const t=limaParts(),m={...t,productoId,productoNombre:p.nombre,tipo,cantidad,stockAnterior:old,stockNuevo:neu,usuarioId:state.currentUser.id,motivo:motivo||''};tx.update(pr,{stock:neu,...(tipo==='Entrada'&&Number(costoUnitario)>0?{precioCompra:Number(costoUnitario)}:{})});tx.set(db.collection('movements').doc(),m);if(tipo==='Entrada'&&Number(costoUnitario)>0)tx.set(db.collection('expenses').doc(),{...t,concepto:`Compra de stock: ${p.nombre}`,categoria:'Stock',monto:+(cantidad*Number(costoUnitario)).toFixed(2),origen:'Compra de stock',usuarioId:state.currentUser.id});});await audit('MOVIMIENTO_STOCK',`${tipo} ${productoId} x${cantidad}`);return{ok:true}}catch(e){return{ok:false,error:e.message}}}
  function addToCart(productoId,qty=1){const p=getProduct(productoId);if(!p||p.estado!=='Activo'||p.stock<=0)return{ok:false,error:'Producto no disponible'};const i=state.cart.find(x=>x.productoId===productoId),n=(i?.cantidad||0)+qty;if(n>p.stock)return{ok:false,error:`Stock insuficiente (disponible: ${p.stock})`};i?i.cantidad=n:state.cart.push({productoId,cantidad:qty});return{ok:true}}
  function updateCartQty(id,c){const p=getProduct(id);if(!p)return{ok:false};if(c<=0)state.cart=state.cart.filter(x=>x.productoId!==id);else{if(c>p.stock)return{ok:false,error:`Máximo ${p.stock} unidades`};const i=state.cart.find(x=>x.productoId===id);if(i)i.cantidad=c;}return{ok:true}}
  function removeFromCart(id){state.cart=state.cart.filter(x=>x.productoId!==id)} function clearCart(){state.cart=[]}
  function getCartTotal(){return state.cart.reduce((s,i)=>s+(getProduct(i.productoId)?.precioVenta||0)*i.cantidad,0)}
  async function ensureCashLock(caja){
    const u=state.currentUser;
    if(!u||!caja?.id)return{ok:false,error:'Caja inválida'};
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
      return{ok:true};
    }catch(e){return{ok:false,error:e.message||'No se pudo validar la caja activa'}}
  }
  async function confirmSale(metodoPago){if(!state.cart.length)return{ok:false,error:'Carrito vacío'};if(!['Efectivo','Yape','Plin','Tarjeta'].includes(metodoPago))return{ok:false,error:'Método de pago inválido'};const hoy=today();const caja=state.cashSessions.find(x=>x.usuarioId===state.currentUser.id&&x.estado==='Abierta'&&x.fecha===hoy);if(!caja)return{ok:false,error:'Debes abrir la caja de hoy antes de registrar una venta'};const lock=await ensureCashLock(caja);if(!lock.ok)return lock;const saleRef=db.collection('sales').doc();try{await db.runTransaction(async tx=>{const snaps=[];for(const i of state.cart)snaps.push([i,await tx.get(db.collection('products').doc(i.productoId))]);const items=[];let total=0,costo=0;for(const [i,s] of snaps){if(!s.exists||s.data().stock<i.cantidad)throw Error(`Stock insuficiente para ${s.data()?.nombre||'producto'}`);const p=s.data(),sub=p.precioVenta*i.cantidad;items.push({productoId:s.id,nombre:p.nombre,cantidad:i.cantidad,precioUnitario:p.precioVenta,costoUnitario:p.precioCompra,subtotal:sub});total+=sub;costo+=p.precioCompra*i.cantidad;tx.update(s.ref,{stock:p.stock-i.cantidad});const t=limaParts();tx.set(db.collection('movements').doc(),{...t,productoId:s.id,productoNombre:p.nombre,tipo:'Venta',cantidad:i.cantidad,stockAnterior:p.stock,stockNuevo:p.stock-i.cantidad,usuarioId:state.currentUser.id,motivo:`Venta ${saleRef.id}`});}const t=limaParts();tx.set(saleRef,{...t,numero:`V-${saleRef.id.slice(0,6).toUpperCase()}`,empleadoId:state.currentUser.id,empleadoNombre:`${state.currentUser.nombres} ${state.currentUser.apellidos}`,cajaId:caja.id,items,total:+total.toFixed(2),costoTotal:+costo.toFixed(2),metodoPago,estado:'Completada',createdAt:firebase.firestore.FieldValue.serverTimestamp()});});state.cart=[];await audit('VENTA',saleRef.id);return{ok:true,sale:{id:saleRef.id,numero:`V-${saleRef.id.slice(0,6).toUpperCase()}`,metodoPago}}}catch(e){return{ok:false,error:e.message}}}
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
          if(!snap.exists)throw Error(`Producto no encontrado: ${i.nombre||i.productoId}`);
          const qty=Number(i.cantidad||0); if(!Number.isFinite(qty)||qty<=0)throw Error(`Cantidad inválida en ${i.nombre||'producto'}`);
          productReads.push({item:i,ref,snap,qty});
        }

        // 2) Escrituras después de terminar las lecturas.
        const t=limaParts();
        for(const x of productReads){
          const old=Number(x.snap.data().stock||0),neu=old+x.qty;
          tx.update(x.ref,{stock:neu});
          tx.set(db.collection('movements').doc(),{...t,productoId:x.item.productoId,productoNombre:x.item.nombre||x.snap.data().nombre||'',tipo:'Devolución',cantidad:x.qty,stockAnterior:old,stockNuevo:neu,usuarioId:state.currentUser.id,motivo:`Anulación ${id}: ${motivo}`});
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
      await audit('ANULAR_VENTA',`${id}: ${motivo}`);
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
      const ref=await db.collection('expenses').add(payload);
      if(!state.expenses.some(e=>e.id===ref.id))state.expenses.push({id:ref.id,...payload});
      try{await audit('REGISTRAR_GASTO',`${concepto} · S/${monto.toFixed(2)}`)}catch(err){console.warn('Auditoría gasto:',err)}
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

    // Compatibilidad con sesiones creadas antes de v26: comprobar Firestore directamente
    // antes de intentar crear el bloqueo transaccional.
    try{
      const existing=await db.collection('cashSessions').where('usuarioId','==',u.id).get();
      const openDoc=existing.docs.find(d=>d.data().estado==='Abierta');
      if(openDoc){
        if(!state.cashSessions.some(x=>x.id===openDoc.id))state.cashSessions.push({id:openDoc.id,...openDoc.data()});
        return{ok:false,error:'Ya tienes una caja abierta. Cierra esa sesión antes de abrir otra'};
      }
    }catch(e){
      console.warn('Verificación previa de caja:',e);
    }

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
      if(!state.cashSessions.some(x=>x.id===cashId))state.cashSessions.push({id:cashId,...t,usuarioId:u.id,usuarioNombre:payload.usuarioNombre,montoInicial:+initial.toFixed(2),estado:'Abierta'});
      try{await audit('ABRIR_CAJA',`S/${initial.toFixed(2)}`);}catch(err){console.warn('Auditoría de apertura:',err);}
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
      // Se consulta Firestore directamente: el cierre no depende de que el listener local ya se haya actualizado.
      const qs=await db.collection('sales').where('empleadoId','==',u.id).where('cajaId','==',c.id).get();
      const ventas=qs.docs.map(d=>({id:d.id,...d.data()})).filter(s=>s.estado!=='Anulada');
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
      });
      const local=state.cashSessions.find(x=>x.id===c.id);if(local)Object.assign(local,{estado:'Cerrada',fechaCierre:t.fecha,horaCierre:t.hora,totalVentasDia:+totalVentasDia.toFixed(2),cantidadVentasDia:ventas.length,efectivoVentas:+efectivo.toFixed(2),yapeVentas:+yape.toFixed(2),plinVentas:+plin.toFixed(2),tarjetaVentas:+tarjeta.toFixed(2),esperado:+esperado.toFixed(2),real:+real.toFixed(2),diferencia:+dif.toFixed(2)});
      await audit('CERRAR_CAJA',`Ventas día S/${totalVentasDia.toFixed(2)} · Diferencia efectivo S/${dif.toFixed(2)}`);
      return{ok:true,diferencia:dif,totalVentasDia};
    }catch(e){return{ok:false,error:e.message||'No se pudo cerrar la caja'}}
  }
  return {state,load,login,logout,getCategory,getProduct,getUser,stockStatus,lowStockProducts,addUser:(...a)=>guarded('addUser',()=>addUser(...a)),updateUser:(...a)=>guarded('updateUser:'+a[0],()=>updateUser(...a)),sendPasswordReset:(...a)=>guarded('resetPassword:'+a[0],()=>sendPasswordReset(...a)),deleteUser:(...a)=>guarded('deleteUser:'+a[0],()=>deleteUser(...a)),addCategory:(...a)=>guarded('addCategory',()=>addCategory(...a)),updateCategory:(...a)=>guarded('updateCategory:'+a[0],()=>updateCategory(...a)),deleteCategory:(...a)=>guarded('deleteCategory:'+a[0],()=>deleteCategory(...a)),addProduct:(...a)=>guarded('addProduct',()=>addProduct(...a)),updateProduct:(...a)=>guarded('updateProduct:'+a[0],()=>updateProduct(...a)),deleteProduct:(...a)=>guarded('deleteProduct:'+a[0],()=>deleteProduct(...a)),addMovement:(...a)=>guarded('movement:'+a[0]?.productoId,()=>addMovement(...a)),addToCart,updateCartQty,removeFromCart,clearCart,getCartTotal,confirmSale:(...a)=>guarded('sale',()=>confirmSale(...a)),cancelSale:(...a)=>guarded('cancelSale:'+a[0],()=>cancelSale(...a)),addExpense:(...a)=>guarded('expense',()=>addExpense(...a)),today,salesToday,expensesToday,totalSales,totalExpenses,openCash:(...a)=>guarded('openCash',()=>openCash(...a)),closeCash:(...a)=>guarded('closeCash',()=>closeCash(...a)),audit};
})();
