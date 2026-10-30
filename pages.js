/* ===== ALL PAGES / VIEWS ===== */
const Pages = {
  _pageSize: 10,
  _pages: {},
  _filterTimers: {},

  // Los filtros de texto esperan unas milésimas antes de redibujar. Así evitamos
  // rehacer toda la tabla por cada tecla y la búsqueda se siente inmediata.
  _queueFilter(key, fn, delay = 90) {
    clearTimeout(this._filterTimers[key]);
    this._filterTimers[key] = setTimeout(() => {
      try { fn(); } catch (e) { console.error(e); Toast.show('No se pudo aplicar el filtro', 'error'); }
    }, delay);
  },
  queueGastoFilter() { this._queueFilter('gastos', () => this.filterGastos(false)); },
  queueHistorialFilter() { this._queueFilter('historial', () => this.filterHistorial(false)); },

  _durationLabel(minutes) {
    minutes=Math.max(0,Number(minutes)||0);
    const h=Math.floor(minutes/60), m=Math.floor(minutes%60);
    return h?`${h} h ${m} min`:`${m} min`;
  },
  _journeyMatches(record, journeyId) {
    if(!journeyId)return true;
    return record?.jornadaId===journeyId || record?.cajaId===journeyId;
  },
  _journeyOptions(selected='') {
    const user=Auth.currentUser();
    const list=[...Store.state.jornadas]
      .filter(j=>Auth.isAdmin()||j.usuarioId===user?.id)
      .sort((a,b)=>(`${b.fechaApertura||b.fecha||''}${b.horaApertura||b.hora||''}`).localeCompare(`${a.fechaApertura||a.fecha||''}${a.horaApertura||a.hora||''}`));
    return `<option value="">Todas las jornadas</option>`+list.map(j=>{
      const label=`${j.numero||Store.journeyNumber(j.id)} · ${Utils.formatDate(j.fechaApertura||j.fecha)} ${Utils.formatTime(j.horaApertura||j.hora)}${j.estado==='Abierta'?' · ABIERTA':''}`;
      return `<option value="${Utils.escapeHtml(j.id)}" ${selected===j.id?'selected':''}>${Utils.escapeHtml(label)}</option>`;
    }).join('');
  },
  _journeyStats(j) {
    if(!j)return{sales:[],expenses:[],cashMovements:[],pay:{Efectivo:0,Yape:0,Plin:0,Tarjeta:0},totalSales:0,totalExpenses:0,gastosEfectivo:0,ingresos:0,retiros:0,expected:0,duration:0};
    const sales=Store.state.sales.filter(x=>x.estado!=='Anulada'&&this._journeyMatches(x,j.id));
    const expenses=Store.state.expenses.filter(x=>this._journeyMatches(x,j.id));
    const cashMovements=Store.state.cashMovements.filter(x=>this._journeyMatches(x,j.id));
    const calc=Store.paymentTotals(sales);
    const pay={
      Efectivo:j.estado==='Cerrada'&&j.efectivoVentas!=null?Number(j.efectivoVentas||0):calc.Efectivo,
      Yape:j.estado==='Cerrada'&&j.yapeVentas!=null?Number(j.yapeVentas||0):calc.Yape,
      Plin:j.estado==='Cerrada'&&j.plinVentas!=null?Number(j.plinVentas||0):calc.Plin,
      Tarjeta:j.estado==='Cerrada'&&j.tarjetaVentas!=null?Number(j.tarjetaVentas||0):calc.Tarjeta
    };
    const totalSales=j.estado==='Cerrada'&&j.totalVentas!=null?Number(j.totalVentas||0):Object.values(pay).reduce((a,b)=>a+b,0);
    const totalExpenses=j.estado==='Cerrada'&&j.totalGastos!=null?Number(j.totalGastos||0):expenses.reduce((a,e)=>a+Number(e.monto||0),0);
    const gastosEfectivo=j.estado==='Cerrada'&&j.gastosEfectivo!=null?Number(j.gastosEfectivo||0):expenses.filter(e=>String(e.metodoPago||'Otro')==='Efectivo').reduce((a,e)=>a+Number(e.monto||0),0);
    const ingresos=j.estado==='Cerrada'&&j.ingresosEfectivo!=null?Number(j.ingresosEfectivo||0):cashMovements.filter(m=>m.tipo==='Ingreso').reduce((a,m)=>a+Number(m.monto||0),0);
    const retiros=j.estado==='Cerrada'&&j.retirosEfectivo!=null?Number(j.retirosEfectivo||0):cashMovements.filter(m=>m.tipo==='Retiro').reduce((a,m)=>a+Number(m.monto||0),0);
    const initial=Number(j.montoInicial||0);
    const expected=j.estado==='Cerrada'&&j.efectivoEsperado!=null?Number(j.efectivoEsperado||0):initial+pay.Efectivo+ingresos-retiros-gastosEfectivo;
    const duration=j.duracionMinutos!=null?Number(j.duracionMinutos||0):Store.journeyDurationMinutes(j);
    return{sales,expenses,cashMovements,pay,totalSales:+totalSales.toFixed(2),totalExpenses:+totalExpenses.toFixed(2),gastosEfectivo:+gastosEfectivo.toFixed(2),ingresos:+ingresos.toFixed(2),retiros:+retiros.toFixed(2),expected:+expected.toFixed(2),duration};
  },
  selectJourneyFilter(kind) {
    const map={historial:['hist-journey','hist-from','hist-to',()=>this.filterHistorial(true)],gastos:['gasto-journey','gasto-from','gasto-to',()=>this.filterGastos(true)],movimientos:['mov-journey','mov-from','mov-to',()=>this.filterMovimientos(true)]};
    const cfg=map[kind];if(!cfg)return;
    const sel=document.getElementById(cfg[0]),j=Store.state.jornadas.find(x=>x.id===sel?.value);
    if(j){
      const from=document.getElementById(cfg[1]),to=document.getElementById(cfg[2]);
      if(from)from.value=j.fechaApertura||j.fecha||Store.today();
      if(to)to.value=j.fechaCierre||Store.today();
    }
    cfg[3]();
  },
  _paginateRows(key, tbodyId, page = 1) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll(':scope > tr')).filter(r => !r.classList.contains('mobile-empty-row'));
    const size = this._pageSize;
    const totalPages = Math.max(1, Math.ceil(rows.length / size));
    page = Math.min(Math.max(1, Number(page)||1), totalPages);
    this._pages[key] = page;
    rows.forEach((r,i) => { r.style.display=''; r.classList.toggle('pagination-hidden', !(i >= (page-1)*size && i < page*size)); });
    let nav = document.getElementById('pager-'+key);
    if (!nav) {
      nav = document.createElement('div'); nav.id='pager-'+key; nav.className='pagination-bar';
      (tbody.closest('.table-wrap') || tbody.closest('.table-responsive') || tbody.parentElement).after(nav);
    }
    nav.innerHTML = rows.length > size ? `<button class="btn btn-sm btn-secondary" ${page<=1?'disabled':''} onclick="Pages._paginateRows('${key}','${tbodyId}',${page-1})">‹ Anterior</button><span>Página <strong>${page}</strong> de ${totalPages} · ${rows.length} registros</span><button class="btn btn-sm btn-secondary" ${page>=totalPages?'disabled':''} onclick="Pages._paginateRows('${key}','${tbodyId}',${page+1})">Siguiente ›</button>` : (rows.length ? `<span>${rows.length} registro(s)</span>` : '');
  },
  initPagination(route) {
    const map={productos:['productos','prod-tbody'],historial:['historial','hist-tbody'],movimientos:['movimientos','mov-tbody'],gastos:['gastos','gasto-tbody'],empleados:['empleados','emp-tbody'],caja:['caja','cash-tbody'],jornadas:['jornadas','journey-tbody']};
    const x=map[route]; if(x) this._paginateRows(x[0],x[1],1);
  },
  // ---------- DASHBOARD ADMIN ----------
  dashboardAdmin() {
    const user=Auth.currentUser();
    const jornada=Store.getOpenJourney(user?.id);
    const caja=Store.getOpenCash(user?.id);
    const stats=jornada?this._journeyStats(jornada):null;
    const salesBase=jornada?stats.sales:Store.salesToday();
    const totalSales=jornada?stats.totalSales:salesBase.reduce((s,x)=>s+Number(x.total||0),0);
    const pay=jornada?stats.pay:Store.paymentTotals(salesBase);
    const expenses=jornada?stats.expenses:Store.expensesToday();
    const totalExpenses=jornada?stats.totalExpenses:expenses.reduce((s,x)=>s+Number(x.monto||0),0);
    const low=Store.lowStockProducts();
    const recent=[...salesBase].sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`)).slice(0,6);
    const duration=jornada?this._durationLabel(stats.duration):'';
    const stale=jornada&&stats.duration>=14*60;

    return `
      <div class="page-header ux-page-head">
        <div><h1 class="page-title">📊 Dashboard</h1><p class="ux-page-sub">${jornada?'Resumen de la jornada actual':'Resumen del día · abre una jornada para iniciar la operación del bar'}</p></div>
      </div>
      ${jornada?`
        <div class="ux-cash-banner is-open">
          <div><span class="ux-status-dot"></span><strong>🌙 ${Utils.escapeHtml(jornada.numero||Store.journeyNumber(jornada.id))} abierta</strong><small>Desde ${Utils.formatDate(jornada.fechaApertura||jornada.fecha)} ${Utils.formatTime(jornada.horaApertura||jornada.hora)} · ${duration} · continúa aunque cambie el día</small></div>
          <button class="btn btn-secondary" onclick="Router.go('caja')">Ver jornada</button>
        </div>
        ${stale?`<div class="alert ux-cash-overnight"><strong>⚠️ Jornada prolongada</strong><br>Lleva ${duration} abierta. No se cerrará sola; verifica que todavía corresponda continuarla.</div>`:''}
      `:`<div class="ux-cash-banner is-closed"><div><span class="ux-status-dot"></span><strong>No hay jornada abierta</strong><small>Abre una jornada antes de registrar ventas.</small></div><button class="btn btn-primary" onclick="Router.go('caja')">Abrir jornada</button></div>`}
      <div class="ux-quick-actions">
        <button class="ux-action primary" onclick="Router.go('ventas')"><span>🛒</span><b>Nueva venta</b><small>Cobrar productos</small></button>
        <button class="ux-action" onclick="Router.go('productos')"><span>📦</span><b>Inventario</b><small>Productos y stock</small></button>
        <button class="ux-action" onclick="Router.go('gastos')"><span>💸</span><b>Registrar gasto</b><small>Control de egresos</small></button>
        <button class="ux-action" onclick="Router.go('jornadas')"><span>🌙</span><b>Jornadas</b><small>Historial por turno</small></button>
      </div>
      <div class="stat-cards">
        <div class="stat-card"><div class="stat-label">💰 ${jornada?'Ventas de la jornada':'Ventas de hoy'}</div><div class="stat-value amber">${Utils.formatMoney(totalSales)}</div><div class="stat-sub">${salesBase.length} venta(s) válida(s)</div></div>
        <div class="stat-card"><div class="stat-label">💵 Efectivo</div><div class="stat-value">${Utils.formatMoney(pay.Efectivo)}</div><div class="stat-sub">Solo ventas, sin monto inicial</div></div>
        <div class="stat-card"><div class="stat-label">📱 Yape / Plin</div><div class="stat-value">${Utils.formatMoney(pay.Yape+pay.Plin)}</div><div class="stat-sub">Yape ${Utils.formatMoney(pay.Yape)} · Plin ${Utils.formatMoney(pay.Plin)}</div></div>
        <div class="stat-card"><div class="stat-label">💳 Tarjeta</div><div class="stat-value">${Utils.formatMoney(pay.Tarjeta)}</div><div class="stat-sub">Pagos con tarjeta</div></div>
      </div>
      <div class="ux-mini-metrics">
        <span>💸 ${jornada?'Gastos de jornada':'Gastos hoy'} <strong>${Utils.formatMoney(totalExpenses)}</strong></span>
        ${jornada?`<span>🏁 Monto inicial <strong>${Utils.formatMoney(jornada.montoInicial||caja?.montoInicial||0)}</strong></span>`:''}
        <span>⚠️ Stock bajo / agotado <strong>${low.length}</strong></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem" class="dash-grid">
        <div class="card">
          <h3 style="margin-bottom:1rem;font-size:1.1rem">🧾 Ventas recientes ${jornada?'de la jornada':'de hoy'}</h3>
          ${recent.length===0?Components.empty('🧾','Todavía no hay ventas registradas'):`
            <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Empleado</th><th>Total</th><th>Método</th></tr></thead><tbody>
              ${recent.map(v=>`<tr><td>${Utils.formatDate(v.fecha)} ${Utils.formatTime(v.hora)}</td><td>${Utils.escapeHtml(Store.getUser(v.empleadoId)?.nombres||v.empleadoNombre||'—')}</td><td style="color:var(--amber)">${Utils.formatMoney(v.total)}</td><td>${Utils.escapeHtml(Store.salePaymentLabel(v))}</td></tr>`).join('')}
            </tbody></table></div>`}
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><h3 style="font-size:1.1rem">📦 Alertas de inventario</h3><button class="btn btn-sm btn-secondary" onclick="Router.go('productos')">Ver inventario</button></div>
          ${low.length===0?Components.empty('✅','Todo el stock está en niveles normales'):`<div class="alert-list">${low.map(p=>{const st=Store.stockStatus(p);return `<div class="alert-item ${st==='agotado'?'danger':''}"><span style="font-size:1.3rem">${Utils.escapeHtml(p.imagen||'📦')}</span><div class="ai-name">${Utils.escapeHtml(p.nombre)}</div><div class="ai-stock">Stock: <strong>${p.stock}</strong> / mín. ${p.stockMinimo}</div>${Utils.stockBadge(st)}</div>`}).join('')}</div>`}
        </div>
      </div>
      <style>@media(max-width:900px){ .dash-grid{grid-template-columns:1fr !important;} }</style>
    `;
  },

  // ---------- DASHBOARD EMPLEADO ----------
  dashboardEmployee() {
    const user=Auth.currentUser();
    const jornada=Store.getOpenJourney(user?.id);
    const stats=jornada?this._journeyStats(jornada):null;
    const sales=jornada?stats.sales:Store.state.sales.filter(v=>v.empleadoId===user.id&&v.estado!=='Anulada'&&v.fecha===Store.today());
    const total=jornada?stats.totalSales:sales.reduce((a,b)=>a+Number(b.total||0),0);
    const pay=jornada?stats.pay:Store.paymentTotals(sales);
    const itemsSold=sales.reduce((s,v)=>s+(v.items||[]).reduce((a,i)=>a+Number(i.cantidad||0),0),0);
    const duration=jornada?this._durationLabel(stats.duration):'';
    return `
      <div class="page-header ux-page-head"><div><h1 class="page-title">🏠 Hola, ${Utils.escapeHtml(user.nombres)}</h1><p class="ux-page-sub">${jornada?'Tu actividad en la jornada actual':'Abre una jornada para comenzar a vender'}</p></div></div>
      ${jornada?`<div class="ux-cash-banner is-open"><div><span class="ux-status-dot"></span><strong>🌙 ${Utils.escapeHtml(jornada.numero||Store.journeyNumber(jornada.id))} abierta</strong><small>Desde ${Utils.formatDate(jornada.fechaApertura||jornada.fecha)} ${Utils.formatTime(jornada.horaApertura||jornada.hora)} · ${duration}</small></div><button class="btn btn-secondary" onclick="Router.go('caja')">Ver jornada</button></div>`:
      `<div class="ux-cash-banner is-closed"><div><span class="ux-status-dot"></span><strong>No hay jornada abierta</strong><small>Debes abrir una jornada antes de vender.</small></div><button class="btn btn-primary" onclick="Router.go('caja')">Abrir jornada</button></div>`}
      <div class="stat-cards">
        <div class="stat-card"><div class="stat-label">💰 ${jornada?'Mis ventas de la jornada':'Mis ventas de hoy'}</div><div class="stat-value amber">${Utils.formatMoney(total)}</div><div class="stat-sub">${sales.length} venta(s)</div></div>
        <div class="stat-card"><div class="stat-label">📦 Productos vendidos</div><div class="stat-value">${itemsSold}</div><div class="stat-sub">unidades</div></div>
        <div class="stat-card"><div class="stat-label">💵 Efectivo</div><div class="stat-value">${Utils.formatMoney(pay.Efectivo)}</div><div class="stat-sub">Ventas cobradas en efectivo</div></div>
      </div>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem"><button class="btn btn-primary" onclick="Router.go('ventas')" style="padding:0.85rem 1.5rem;font-size:1rem">🛒 Nueva venta</button><button class="btn btn-secondary" onclick="Router.go('jornadas')">🌙 Mis jornadas</button></div>
      <div class="card"><h3 style="margin-bottom:.75rem">💡 Cómo funciona la jornada</h3><p class="ux-help">Tu jornada puede seguir abierta después de medianoche. Todas las ventas continúan dentro del mismo turno hasta que tú la cierres desde Caja.</p></div>
    `;
  },

  // ---------- EMPLEADOS ----------
  empleados() {
    if (!Auth.requireAdmin()) return '';
    const users = Store.state.users.filter(u => u.role === 'empleado');
    return `
      <div class="page-header">
        <h1 class="page-title">Empleados</h1>
        <button class="btn btn-primary" onclick="Pages.openEmpleadoForm()">+ Agregar empleado</button>
      </div>
      <div class="toolbar">
        <input type="search" class="search-input" id="emp-search" placeholder="Buscar por nombre o correo..." oninput="Pages.filterEmpleados()" />
      </div>
      <div class="table-wrap" id="emp-table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Apellido</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody id="emp-tbody">
            ${this._empRows(users)}
          </tbody>
        </table>
      </div>
      <div class="mobile-cards" id="emp-cards">${this._empCards(users)}</div>
    `;
  },
  _empRows(users) {
    if (!users.length) return `<tr><td colspan="6">${Components.empty('👥', 'No hay empleados registrados')}</td></tr>`;
    return users.map(u => `
      <tr data-search="${(u.nombres + ' ' + u.apellidos + ' ' + u.email).toLowerCase()}">
        <td data-label="Nombre">${Utils.escapeHtml(u.nombres)}</td>
        <td data-label="Apellido">${Utils.escapeHtml(u.apellidos)}</td>
        <td data-label="Correo">${Utils.escapeHtml(u.email)}</td>
        <td data-label="Teléfono">${Utils.escapeHtml(u.telefono || '—')}</td>
        <td data-label="Estado">${u.estado === 'Activo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
        <td class="table-actions" data-label="Acciones">
          <button class="btn btn-sm btn-secondary" onclick="Pages.openEmpleadoForm('${u.id}')">Editar</button>
          ${u.role !== 'admin' ? `<button class="btn btn-sm btn-secondary" onclick="Pages.resetEmpleadoPassword('${u.id}')">Restablecer clave</button><button class="btn btn-sm btn-danger" onclick="Pages.deleteEmpleado('${u.id}')">Desactivar</button>` : ''}
        </td>
      </tr>
    `).join('');
  },
  _empCards(users) {
    if (!users.length) return Components.empty('👥', 'No hay empleados registrados');
    return users.map(u => `
      <div class="card" style="margin-bottom:0.75rem" data-search="${(u.nombres + ' ' + u.apellidos + ' ' + u.email).toLowerCase()}">
        <strong>${Utils.escapeHtml(u.nombres)} ${Utils.escapeHtml(u.apellidos)}</strong>
        <div style="font-size:0.85rem;color:var(--text-secondary);margin:0.3rem 0">${Utils.escapeHtml(u.email)}</div>
        <div style="margin-bottom:0.6rem">${u.estado === 'Activo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</div>
        <div class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="Pages.openEmpleadoForm('${u.id}')">Editar</button>
          ${u.role !== 'admin' ? `<button class="btn btn-sm btn-secondary" onclick="Pages.resetEmpleadoPassword('${u.id}')">Restablecer clave</button><button class="btn btn-sm btn-danger" onclick="Pages.deleteEmpleado('${u.id}')">Desactivar</button>` : ''}
        </div>
      </div>
    `).join('');
  },
  filterEmpleados() {
    const q = (document.getElementById('emp-search')?.value || '').toLowerCase();
    const users = Store.state.users.filter(u => (`${u.nombres||''} ${u.apellidos||''} ${u.email||''}`).toLowerCase().includes(q));
    const tbody=document.getElementById('emp-tbody'), cards=document.getElementById('emp-cards');
    if(tbody){tbody.innerHTML=this._empRows(users); App.makeTablesMobileFriendly(tbody.closest('.table-wrap')||document); this._paginateRows('empleados','emp-tbody',1);}
    if(cards) cards.innerHTML=this._empCards(users);
  },
  openEmpleadoForm(id) {
    const u = id ? Store.getUser(id) : null;
    const isEdit = !!u;
    Modal.open(`
      <div class="modal-header">
        <h2>${isEdit ? 'Editar empleado' : 'Nuevo empleado'}</h2>
        <button class="btn-icon" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <form id="emp-form">
          <div class="form-row">
            <div class="form-group">
              <label>Nombres *</label>
              <input type="text" name="nombres" required value="${Utils.escapeHtml(u?.nombres || '')}" />
            </div>
            <div class="form-group">
              <label>Apellidos *</label>
              <input type="text" name="apellidos" required value="${Utils.escapeHtml(u?.apellidos || '')}" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>DNI *</label>
              <input type="text" name="dni" required value="${Utils.escapeHtml(u?.dni || '')}" />
            </div>
            <div class="form-group">
              <label>Teléfono *</label>
              <input type="tel" name="telefono" required value="${Utils.escapeHtml(u?.telefono || '')}" />
            </div>
          </div>
          <div class="form-group">
            <label>Correo de acceso *</label>
            <input type="email" name="email" required ${isEdit ? 'readonly' : ''} value="${Utils.escapeHtml(u?.email || '')}" />
            ${isEdit ? '<small class="text-muted">El correo de Authentication no se modifica desde este formulario para evitar desincronizar el acceso.</small>' : ''}
          </div>
          ${isEdit ? `
            <div class="form-group">
              <label>Contraseña</label>
              <small class="text-muted">La contraseña se restablece desde el botón “Restablecer clave” en la lista de empleados.</small>
            </div>
          ` : `
            <div class="form-row">
              <div class="form-group">
                <label>Contraseña *</label>
                <input type="password" name="password" required minlength="6" autocomplete="new-password" />
              </div>
              <div class="form-group">
                <label>Confirmar contraseña *</label>
                <input type="password" name="password2" required minlength="6" autocomplete="new-password" />
              </div>
            </div>
          `}
          <div class="form-group">
            <label>Estado</label>
            <select name="estado">
              <option value="Activo" ${u?.estado === 'Activo' ? 'selected' : ''}>Activo</option>
              <option value="Inactivo" ${u?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
          <div id="emp-form-error" class="error-msg hidden"></div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Pages.saveEmpleado('${id || ''}')">Guardar</button>
      </div>
    `);
  },
  async saveEmpleado(id) {
    const form = document.getElementById('emp-form');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const errEl = document.getElementById('emp-form-error');
    errEl.classList.add('hidden');

    if (!data.nombres || !data.apellidos || !data.dni || !data.telefono || !data.email) {
      errEl.textContent = 'Completa todos los campos obligatorios';
      errEl.classList.remove('hidden');
      return;
    }
    if (!id && !data.password) {
      errEl.textContent = 'La contraseña es obligatoria';
      errEl.classList.remove('hidden');
      return;
    }
    if (data.password && data.password !== data.password2) {
      errEl.textContent = 'Las contraseñas no coinciden';
      errEl.classList.remove('hidden');
      return;
    }
    if (data.password && data.password.length < 6) {
      errEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
      errEl.classList.remove('hidden');
      return;
    }

    let res;
    if (id) {
      res = await Store.updateUser(id, data);
    } else {
      res = await Store.addUser(data);
    }
    if (!res.ok) {
      errEl.textContent = res.error;
      errEl.classList.remove('hidden');
      return;
    }
    Modal.close();
    Toast.show(id ? 'Empleado actualizado' : 'Empleado creado');
    Router.go('empleados');
  },
  resetEmpleadoPassword(id) {
    const u = Store.getUser(id);
    if (!u?.email) return Toast.show('El empleado no tiene un correo válido', 'error');
    confirmAction(`Se enviará un enlace de restablecimiento a ${u.email}. ¿Continuar?`, async () => {
      const res = await Store.sendPasswordReset(id);
      Toast.show(res.ok ? 'Enlace de restablecimiento enviado' : res.error, res.ok ? 'success' : 'error');
      if (res.ok) Modal.close();
      return res;
    }, { title:'Restablecer contraseña', confirmText:'Enviar enlace', danger:false, key:'reset-password:'+id });
  },
  deleteEmpleado(id) {
    confirmAction('¿Desactivar este empleado?', async () => {
      const res = await Store.deleteUser(id);
      Toast.show(res.ok ? 'Empleado desactivado' : res.error, res.ok ? 'success' : 'error');
      if (res.ok) { Modal.close(); Router.go('empleados'); }
      return res;
    }, { title:'Desactivar empleado', confirmText:'Desactivar', danger:true, key:'delete-user:'+id });
  },

  // ---------- CATEGORÍAS ----------
  categorias() {
    if (!Auth.requireAdmin()) return '';
    const cats = Store.state.categories;
    return `
      <div class="page-header">
        <h1 class="page-title">Categorías</h1>
        <button class="btn btn-primary" onclick="Pages.openCategoriaForm()">+ Nueva categoría</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Categoría</th><th>Productos</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            ${cats.length === 0 ? `<tr><td colspan="4">${Components.empty('📂', 'No hay categorías')}</td></tr>` :
              cats.map(c => {
                const count = Store.state.products.filter(p => p.categoriaId === c.id).length;
                return `<tr>
                  <td><strong>${Utils.escapeHtml(c.nombre)}</strong></td>
                  <td>${count}</td>
                  <td>${c.estado === 'Activo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
                  <td class="table-actions">
                    <button class="btn btn-sm btn-secondary" onclick="Pages.openCategoriaForm('${c.id}')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="Pages.deleteCategoria('${c.id}')">Eliminar</button>
                  </td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
  openCategoriaForm(id) {
    const c = id ? Store.state.categories.find(x => x.id === id) : null;
    Modal.open(`
      <div class="modal-header">
        <h2>${c ? 'Editar categoría' : 'Nueva categoría'}</h2>
        <button class="btn-icon" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Nombre *</label>
          <input type="text" id="cat-nombre" value="${Utils.escapeHtml(c?.nombre || '')}" required />
        </div>
        ${c ? `
        <div class="form-group">
          <label>Estado</label>
          <select id="cat-estado">
            <option value="Activo" ${c.estado === 'Activo' ? 'selected' : ''}>Activo</option>
            <option value="Inactivo" ${c.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
          </select>
        </div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Pages.saveCategoria('${id || ''}')">Guardar</button>
      </div>
    `);
  },
  async saveCategoria(id) {
    const nombre = document.getElementById('cat-nombre').value.trim();
    if (!nombre) { Toast.show('Nombre obligatorio', 'error'); return; }
    const res = id
      ? await Store.updateCategory(id, { nombre, estado: document.getElementById('cat-estado')?.value })
      : await Store.addCategory(nombre);
    if (!res?.ok) {
      Toast.show(res?.error || 'No se pudo guardar la categoría', 'error');
      return;
    }
    Toast.show(id ? 'Categoría actualizada' : 'Categoría creada');
    Modal.close();
    Router.go('categorias');
  },
  deleteCategoria(id) {
    const c = Store.getCategory(id);
    const count = Store.state.products.filter(p => p.categoriaId === id).length;
    if (count > 0) {
      Toast.show(`No se puede eliminar “${c?.nombre || 'esta categoría'}”: tiene ${count} producto(s). Elimínalos o cámbialos de categoría primero.`, 'error', 5200);
      return;
    }
    confirmAction(`La categoría “${c?.nombre || ''}” se eliminará del catálogo. El historial técnico se conservará en archivo. ¿Continuar?`, async () => {
      const res = await Store.deleteCategory(id);
      Toast.show(res.ok ? 'Categoría eliminada correctamente' : res.error, res.ok ? 'success' : 'error');
      if (res.ok) { Modal.close(); Router.go('categorias'); }
      return res;
    }, { title:'Eliminar categoría', confirmText:'Eliminar definitivamente', danger:true, key:'delete-category:'+id });
  },

  // ---------- INVENTARIO ----------
  productos() {
    if (!Auth.requireAdmin()) return '';
    const products = Store.state.products;
    const cats = Store.state.categories.filter(c => c.estado === 'Activo');
    return `
      <div class="page-header">
        <h1 class="page-title">📦 Inventario</h1>
        <button class="btn btn-primary" onclick="Pages.openProductoForm()">+ Agregar producto</button>
      </div>
      <div class="toolbar">
        <input type="search" class="search-input" id="prod-search" placeholder="Buscar producto..." oninput="Pages.filterProductos()" />
        <select class="filter-select" id="prod-cat-filter" onchange="Pages.filterProductos()">
          <option value="">Todas las categorías</option>
          ${cats.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.nombre)}</option>`).join('')}
        </select>
        <select class="filter-select" id="prod-stock-filter" onchange="Pages.filterProductos()">
          <option value="">Todo el stock</option>
          <option value="normal">Normal</option>
          <option value="bajo">Bajo</option>
          <option value="agotado">Agotado</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th></th><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado stock</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody id="prod-tbody">
            ${products.map(p => Components.productRow(p, `
              <button class="btn btn-sm btn-primary" onclick="Pages.openAddStockForm('${p.id}')">+ Stock</button>
              <button class="btn btn-sm btn-secondary" onclick="Pages.openProductoForm('${p.id}')">Editar</button>
              <button class="btn btn-sm btn-danger" onclick="Pages.deleteProducto('${p.id}')">Eliminar</button>
            `)).join('') || `<tr><td colspan="8">${Components.empty('📦', 'No hay productos registrados')}</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="mobile-cards" id="prod-cards">
        ${products.map(p => Components.mobileProductCard(p, `
          <button class="btn btn-sm btn-primary" onclick="Pages.openAddStockForm('${p.id}')">+ Stock</button>
              <button class="btn btn-sm btn-secondary" onclick="Pages.openProductoForm('${p.id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="Pages.deleteProducto('${p.id}')">Eliminar</button>
        `)).join('') || Components.empty('📦', 'No hay productos registrados')}
      </div>
    `;
  },
  filterProductos() {
    const q = (document.getElementById('prod-search')?.value || '').toLowerCase();
    const cat = document.getElementById('prod-cat-filter')?.value || '';
    const stockF = document.getElementById('prod-stock-filter')?.value || '';
    const rows = document.querySelectorAll('#prod-tbody tr');
    // rebuild is simpler on filter for accuracy
    const filtered = Store.state.products.filter(p => {
      const matchQ = !q || p.nombre.toLowerCase().includes(q);
      const matchC = !cat || p.categoriaId === cat;
      const st = Store.stockStatus(p);
      const matchS = !stockF || st === stockF;
      return matchQ && matchC && matchS;
    });
    const tbody = document.getElementById('prod-tbody');
    const cards = document.getElementById('prod-cards');
    if (tbody) {
      tbody.innerHTML = filtered.map(p => Components.productRow(p, `
        <button class="btn btn-sm btn-primary" onclick="Pages.openAddStockForm('${p.id}')">+ Stock</button>
              <button class="btn btn-sm btn-secondary" onclick="Pages.openProductoForm('${p.id}')">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="Pages.deleteProducto('${p.id}')">Eliminar</button>
      `)).join('') || `<tr><td colspan="8">${Components.empty('📦', 'Sin resultados')}</td></tr>`;
    }
    if (cards) {
      cards.innerHTML = filtered.map(p => Components.mobileProductCard(p, `
        <button class="btn btn-sm btn-primary" onclick="Pages.openAddStockForm('${p.id}')">+ Stock</button>
              <button class="btn btn-sm btn-secondary" onclick="Pages.openProductoForm('${p.id}')">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="Pages.deleteProducto('${p.id}')">Eliminar</button>
      `)).join('') || Components.empty('📦', 'Sin resultados');
    }
    // El filtro reconstruye las filas; volver a aplicar data-label para las tarjetas responsive.
    if (tbody) { App.makeTablesMobileFriendly(tbody.closest('.table-wrap') || document); this._paginateRows('productos','prod-tbody',1); }
  },
  _productIconGroups() {
    return [
      { id:'bar', nombre:'🍺 Bar y bebidas', keywords:'cerveza bar botella alcohol trago copa vino whisky ron coctel champagne hielo', icons:'🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾 🍶 🧉 🫗 🧊 🪣 🍵 ☕ 🫖 🥤 🧃 🧋 🥛 🚰 💧'.split(' ') },
      { id:'frutas', nombre:'🍓 Frutas', keywords:'fruta limon naranja fresa uva pina coco sandia cereza manzana platano mango kiwi pera durazno', icons:'🍏 🍎 🍐 🍊 🍋 🍋‍🟩 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🫒'.split(' ') },
      { id:'verduras', nombre:'🥦 Verduras', keywords:'verdura ensalada palta aguacate papa zanahoria maiz ají cebolla ajo', icons:'🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🫘 🌰 🫛 🫚 🍄'.split(' ') },
      { id:'comidas', nombre:'🍔 Comidas', keywords:'hamburguesa pizza pollo carne hotdog sandwich taco burrito parrilla arroz sopa pasta', icons:'🍔 🍟 🌭 🍕 🥪 🌮 🌯 🫔 🥙 🧆 🍗 🍖 🥩 🍤 🍣 🍱 🍜 🍝 🍛 🍚 🍲 🥘 🥗 🥫'.split(' ') },
      { id:'mar', nombre:'🍤 Mariscos y pescados', keywords:'pescado marisco ceviche camaron langosta sushi', icons:'🐟 🐠 🐡 🦐 🦞 🦀 🦑 🐙 🦪 🍤 🍣 🍥'.split(' ') },
      { id:'snacks', nombre:'🍿 Snacks', keywords:'piqueo snack cancha mani papas queso galleta dulce chocolate', icons:'🍿 🥜 🫘 🫒 🧀 🥨 🍘 🍙 🍚 🍪 🍫 🍬 🍭 🍡 🥠 🥟'.split(' ') },
      { id:'pan', nombre:'🥐 Pan y desayuno', keywords:'pan desayuno huevo tostada croissant cereal tocino miel', icons:'🥐 🥖 🥨 🥯 🥞 🧇 🍞 🥪 🍳 🥚 🥓 🧈 🍯 🥣 🥛'.split(' ') },
      { id:'postres', nombre:'🍰 Postres', keywords:'helado postre dulce torta pastel dona cupcake', icons:'🍦 🍧 🍨 🍮 🍰 🎂 🧁 🥧 🍩 🍪 🍫 🍬 🍭 🍡 🍯'.split(' ') },
      { id:'combos', nombre:'🎁 Promos y combos', keywords:'combo promocion oferta descuento especial nuevo estrella fuego regalo', icons:'🔥 ⭐ 🌟 ✨ 💥 🎉 🎊 🎁 🏷️ 💰 💵 💸 🪙 ✅ 💯 🆕 ❤️ 🧡 💛 💚 💙 💜'.split(' ') },
      { id:'servicio', nombre:'🍽️ Servicio', keywords:'vaso copa plato cubiertos bolsa caja delivery envase servilleta', icons:'🥄 🍴 🍽️ 🥢 🥡 🥣 🫙 🧂 🛍️ 📦 🥫 🧺 🧻 🧴'.split(' ') },
      { id:'tienda', nombre:'🛒 Tienda', keywords:'tienda varios paquete caja producto higiene limpieza bateria luz', icons:'🛒 🛍️ 📦 🎒 👝 🧻 🧼 🫧 🧽 🪥 🧴 🔋 💡 🕯️ 🧯 🧰 🧹 🪣'.split(' ') },
      { id:'fiesta', nombre:'🎵 Fiesta y entretenimiento', keywords:'musica fiesta karaoke billar dardos noche baile juego', icons:'🎵 🎶 🎤 🎧 🎸 🎹 🥁 🪩 🎉 🎯 🎱 🎲 🃏 🎮 📺 🌙 🔊'.split(' ') },
      { id:'animales', nombre:'🐾 Animales', keywords:'animal mascota pollo vaca cerdo pescado', icons:'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐔 🐟 🦐'.split(' ') },
      { id:'transporte', nombre:'🚚 Delivery y transporte', keywords:'delivery moto bici auto camion reparto envio', icons:'🚲 🛵 🏍️ 🚗 🚕 🚙 🛻 🚚 🚛 📦 🏠 📍 🗺️'.split(' ') },
      { id:'numeros', nombre:'🔢 Números', keywords:'pack unidad unidades numero cantidad', icons:'0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 #️⃣ *️⃣'.split(' ') },
      { id:'simbolos', nombre:'🔴 Símbolos', keywords:'color circulo cuadrado corazon flecha check alerta', icons:'🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ ❤️ 🧡 💛 💚 💙 💜 ✅ ❌ ⚠️ ❗ ❓ ➕ ➖ 🔥 ⭐'.split(' ') },
      { id:'caras', nombre:'😀 Caras', keywords:'cara feliz emoji sonrisa amor fiesta', icons:'😀 😃 😄 😁 😆 😅 😂 🙂 😊 😋 😎 😍 🥰 😘 🤩 🥳 😜 🤤 😇 🤠 🤑 🤗 🤝 👍 👌 🙌 👏 💪'.split(' ') },
      { id:'otros', nombre:'💎 Otros', keywords:'otro favorito premium rapido importante disponible', icons:'📌 📍 🏆 🥇 👑 💎 🚀 ⚡ ☀️ 🌙 🌈 🎀 🪄 🔔 🔥 ⭐ ✅ 💯 🆕 🔑 🧾 🧮 💳 💰'.split(' ') }
    ];
  },
  _productIconPicker(selected = '📦') {
    const groups = this._productIconGroups();
    const chips = [`<button type="button" class="product-icon-chip active" data-group="todos" onclick="Pages.setProductIconGroup('todos',this)">Todos</button>`, ...groups.map(g => `<button type="button" class="product-icon-chip" data-group="${g.id}" onclick="Pages.setProductIconGroup('${g.id}',this)">${g.nombre}</button>`)].join('');
    const seenIcons = new Set();
    const sections = groups.map(g => {
      const icons = g.icons.filter(icon => { if (seenIcons.has(icon)) return false; seenIcons.add(icon); return true; });
      return `
      <section class="product-icon-section" data-icon-section="${g.id}">
        <div class="product-icon-section-title">${g.nombre}</div>
        <div class="product-icon-grid">
          ${icons.map(icon => `<button type="button" class="product-icon-option ${icon===selected?'selected':''}" data-icon="${icon}" data-group="${g.id}" data-search="${g.keywords} ${g.nombre.toLowerCase()}" onclick="Pages.selectProductIcon('${icon}',this)" title="Elegir ${icon}">${icon}</button>`).join('')}
        </div>
      </section>`;
    }).join('');
    return `
      <div class="product-icon-picker">
        <div class="product-icon-current">
          <div class="product-icon-preview" id="prod-icon-preview">${selected || '📦'}</div>
          <div><strong>Ícono del producto</strong><small>Presiona un ícono para seleccionarlo. También puedes escribir cualquier emoji.</small></div>
        </div>
        <div class="product-icon-custom">
          <input type="text" id="prod-icon-value" name="imagen" value="${Utils.escapeHtml(selected || '📦')}" oninput="Pages.syncProductIconInput(this.value)" aria-label="Ícono seleccionado" />
          <input type="search" id="prod-icon-search" placeholder="Buscar: cerveza, comida, promo..." oninput="Pages.filterProductIcons()" />
        </div>
        <div class="product-icon-chips">${chips}</div>
        <div class="product-icon-scroll" id="prod-icon-scroll">${sections}</div>
        <div class="product-icon-empty hidden" id="prod-icon-empty">No encontré iconos con ese filtro. Puedes escribir tu propio emoji arriba.</div>
      </div>`;
  },
  selectProductIcon(icon, el) {
    const input = document.getElementById('prod-icon-value');
    const preview = document.getElementById('prod-icon-preview');
    if (input) input.value = icon;
    if (preview) preview.textContent = icon;
    document.querySelectorAll('.product-icon-option.selected').forEach(x => x.classList.remove('selected'));
    if (el) el.classList.add('selected');
  },
  syncProductIconInput(value) {
    const icon = String(value || '').trim() || '📦';
    const preview = document.getElementById('prod-icon-preview');
    if (preview) preview.textContent = icon;
    document.querySelectorAll('.product-icon-option.selected').forEach(x => x.classList.remove('selected'));
    const match = Array.from(document.querySelectorAll('.product-icon-option')).find(x => x.dataset.icon === String(value || '').trim());
    if (match) match.classList.add('selected');
  },
  setProductIconGroup(group, el) {
    document.querySelectorAll('.product-icon-chip').forEach(x => x.classList.remove('active'));
    if (el) el.classList.add('active');
    const picker = document.querySelector('.product-icon-picker');
    if (picker) picker.dataset.activeGroup = group || 'todos';
    this.filterProductIcons();
  },
  filterProductIcons() {
    const picker = document.querySelector('.product-icon-picker');
    if (!picker) return;
    const q = (document.getElementById('prod-icon-search')?.value || '').trim().toLowerCase();
    const group = picker.dataset.activeGroup || 'todos';
    let totalVisible = 0;
    picker.querySelectorAll('.product-icon-section').forEach(section => {
      let sectionVisible = 0;
      section.querySelectorAll('.product-icon-option').forEach(btn => {
        const matchesGroup = group === 'todos' || btn.dataset.group === group;
        const matchesText = !q || `${btn.dataset.search || ''} ${btn.dataset.icon || ''}`.toLowerCase().includes(q);
        const show = matchesGroup && matchesText;
        btn.hidden = !show;
        if (show) { sectionVisible++; totalVisible++; }
      });
      section.hidden = sectionVisible === 0;
    });
    document.getElementById('prod-icon-empty')?.classList.toggle('hidden', totalVisible !== 0);
  },
  openProductoForm(id) {
    const p = id ? Store.getProduct(id) : null;
    const cats = Store.state.categories.filter(c => c.estado === 'Activo');
    if (cats.length === 0) {
      Toast.show('Primero crea al menos una categoría', 'error');
      return;
    }
    Modal.open(`
      <div class="modal-header">
        <h2>${p ? 'Editar producto' : 'Agregar producto'}</h2>
        <button class="btn-icon" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <form id="prod-form">
          <div class="form-group">
            <label>1. Nombre del producto *</label>
            <input type="text" name="nombre" required value="${Utils.escapeHtml(p?.nombre || '')}" />
          </div>
          <div class="form-group">
            <label>2. Categoría *</label>
            <select name="categoriaId" required>
              ${cats.map(c => `<option value="${c.id}" ${p?.categoriaId === c.id ? 'selected' : ''}>${Utils.escapeHtml(c.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>3. Precio de compra (S/) *</label>
              <input type="number" name="precioCompra" step="0.01" min="0" required value="${p?.precioCompra ?? ''}" />
            </div>
            <div class="form-group">
              <label>Precio de venta (S/) *</label>
              <input type="number" name="precioVenta" step="0.01" min="0" required value="${p?.precioVenta ?? ''}" />
            </div>
          </div>
          ${!p ? `
          <div class="form-row">
            <div class="form-group">
              <label>4. Stock inicial *</label>
              <input type="number" name="stock" min="0" required value="0" />
            </div>
            <div class="form-group">
              <label>Stock mínimo *</label>
              <input type="number" name="stockMinimo" min="0" required value="5" />
            </div>
          </div>` : `
          <div class="form-group">
            <label>4. Stock mínimo *</label>
            <input type="number" name="stockMinimo" min="0" required value="${p.stockMinimo}" />
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">Stock actual: <strong>${p.stock}</strong>. Para agregar unidades usa el botón <strong>+ Stock</strong> en Inventario; la compra generará automáticamente su gasto.</p>
          `}
          <div class="form-group">
            <label>5. Descripción (opcional)</label>
            <textarea name="descripcion" rows="2">${Utils.escapeHtml(p?.descripcion || '')}</textarea>
          </div>
          <div class="form-group">
            <label>6. Imagen / ícono *</label>
            ${this._productIconPicker(p?.imagen || '📦')}
          </div>
          <div class="form-group">
            <label>Estado</label>
            <select name="estado">
              <option value="Activo" ${!p || p.estado === 'Activo' ? 'selected' : ''}>Activo</option>
              <option value="Inactivo" ${p?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
          <div id="prod-form-error" class="error-msg hidden"></div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Pages.saveProducto('${id || ''}')">Guardar</button>
      </div>
    `);
  },
  async saveProducto(id) {
    const form = document.getElementById('prod-form');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const errEl = document.getElementById('prod-form-error');
    errEl.classList.add('hidden');

    if (!data.nombre || !data.categoriaId || data.precioCompra === '' || data.precioVenta === '') {
      errEl.textContent = 'Completa los campos obligatorios';
      errEl.classList.remove('hidden');
      return;
    }
    let res;
    if (id) {
      res = await Store.updateProduct(id, data);
    } else {
      res = await Store.addProduct(data);
    }
    if (!res.ok) {
      errEl.textContent = res.error || 'Error al guardar';
      errEl.classList.remove('hidden');
      return;
    }
    Modal.close();
    Toast.show(id ? 'Producto actualizado' : 'Producto creado (movimiento y gasto generados si había stock)');
    Router.go('productos');
  },
  openAddStockForm(productoId) {
    const p = Store.getProduct(productoId);
    if (!p) return;
    Modal.open(`
      <div class="modal-header">
        <h2>Agregar stock</h2>
        <button class="btn-icon" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom:1rem"><strong>${Utils.escapeHtml(p.nombre)}</strong> · Stock actual: <strong>${p.stock}</strong></p>
        <div class="form-group"><label>Cantidad a agregar *</label><input type="number" id="stock-add-qty" min="1" step="1" value="1" oninput="Pages.updateAddStockPreview()" /></div>
        <div class="form-group"><label>Costo unitario de esta compra (S/) *</label><input type="number" id="stock-add-cost" min="0" step="0.01" value="${Number(p.precioCompra || 0).toFixed(2)}" oninput="Pages.updateAddStockPreview()" /><small class="text-muted">Este costo calcula el gasto de esta entrada, pero no cambia el precio de compra maestro guardado en Inventario.</small></div>
        <div class="form-group"><label>Proveedor / observación (opcional)</label><input type="text" id="stock-add-note" placeholder="Ej. compra a proveedor" /></div>
        <div class="card p-3"><small>Gasto que se registrará automáticamente</small><strong id="stock-add-preview" style="font-size:1.2rem;color:var(--amber)">${Utils.formatMoney(Number(p.precioCompra || 0))}</strong></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Pages.saveAddStock('${productoId}')">Agregar stock y registrar gasto</button>
      </div>`);
  },
  updateAddStockPreview() {
    const qty = Number(document.getElementById('stock-add-qty')?.value) || 0;
    const cost = Number(document.getElementById('stock-add-cost')?.value) || 0;
    const el = document.getElementById('stock-add-preview');
    if (el) el.textContent = Utils.formatMoney(qty * cost);
  },
  async saveAddStock(productoId) {
    const cantidad = Number(document.getElementById('stock-add-qty')?.value);
    const costo = Number(document.getElementById('stock-add-cost')?.value);
    const motivo = (document.getElementById('stock-add-note')?.value || '').trim() || 'Compra de stock';
    if (!Number.isInteger(cantidad) || cantidad <= 0) return Toast.show('Ingresa una cantidad válida', 'error');
    if (!Number.isFinite(costo) || costo <= 0) return Toast.show('El costo unitario debe ser mayor que 0 para registrar el gasto', 'error');
    const p = Store.getProduct(productoId); const total = cantidad * costo;
    return confirmAction(`Se agregarán ${cantidad} unidad(es) a ${p?.nombre || 'este producto'} y se registrará un gasto de ${Utils.formatMoney(total)}. ¿Confirmar?`, async () => {
    const res = await Store.addMovement({ productoId, tipo:'Entrada', cantidad, costoUnitario:costo, motivo });
    if (!res.ok) { Toast.show(res.error || 'No se pudo agregar stock', 'error'); return res; }
    Modal.close(); Toast.show('Stock agregado y gasto registrado', 'success'); Router.go('productos');
    return res;
    }, {title:'Confirmar ingreso de stock', confirmText:'Agregar stock', danger:false, key:'add-stock:'+productoId});
  },
  deleteProducto(id) {
    const p = Store.getProduct(id);
    if (!p) return Toast.show('Producto no encontrado', 'error');
    const stock = Number(p.stock || 0);
    const avisoStock = stock > 0 ? ` Actualmente tiene ${stock} unidad(es) en stock.` : '';
    confirmAction(`“${p.nombre}” se eliminará del catálogo y dejará de aparecer en ventas e inventario.${avisoStock} El historial de ventas y movimientos se conservará. ¿Continuar?`, async () => {
      const res = await Store.deleteProduct(id);
      Toast.show(res.ok ? 'Producto eliminado correctamente' : res.error, res.ok ? 'success' : 'error');
      if (res.ok) { Modal.close(); Router.go('productos'); }
      return res;
    }, { title:'Eliminar producto', confirmText:'Eliminar definitivamente', danger:true, key:'delete-product:'+id });
  },

  // ---------- MOVIMIENTOS DE STOCK ----------
  openMovimientoForm(productoId) {
    const p = Store.getProduct(productoId);
    if (!p) return;
    Modal.open(`
      <div class="modal-header">
        <h2>Registrar movimiento</h2>
        <button class="btn-icon" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom:1rem"><strong>${Utils.escapeHtml(p.nombre)}</strong> — Stock actual: <strong>${p.stock}</strong></p>
        <div class="form-group">
          <label>Tipo *</label>
          <select id="mov-tipo" onchange="Pages.toggleCostoField()">
            <option value="Entrada">Entrada</option>
            <option value="Ajuste +">Ajuste (+)</option>
            <option value="Ajuste -">Ajuste (-)</option>
            <option value="Salida">Salida</option>
            <option value="Merma">Merma / rotura</option>
          </select>
        </div>
        <div class="form-group">
          <label>Cantidad *</label>
          <input type="number" id="mov-cantidad" min="1" value="1" required oninput="Pages.updateMovPreview()" />
        </div>
        <div class="form-group"><label>Motivo / observación</label><input type="text" id="mov-motivo" placeholder="Ej. compra proveedor, botella rota..." /></div>
        <div class="form-group" id="mov-costo-group">
          <label>Costo unitario (S/)</label>
          <input type="number" id="mov-costo" step="0.01" min="0" value="${p.precioCompra}" oninput="Pages.updateMovPreview()" />
          <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.3rem">Si lo modificas, se actualizará el precio de compra del producto y se generará un gasto.</p>
        </div>
        <div id="mov-preview" style="background:var(--bg-elevated);padding:0.85rem;border-radius:8px;margin-top:0.5rem;font-size:0.9rem">
          Vista previa del gasto: <strong id="mov-preview-amount" style="color:var(--amber)">S/ 0.00</strong>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Pages.saveMovimiento('${productoId}')">Confirmar</button>
      </div>
    `);
    Pages.updateMovPreview();
  },
  toggleCostoField() {
    const tipo = document.getElementById('mov-tipo').value;
    const group = document.getElementById('mov-costo-group');
    const preview = document.getElementById('mov-preview');
    if (tipo === 'Entrada') {
      group.style.display = '';
      preview.style.display = '';
    } else {
      group.style.display = 'none';
      preview.style.display = 'none';
    }
  },
  updateMovPreview() {
    const qty = Number(document.getElementById('mov-cantidad')?.value) || 0;
    const costo = Number(document.getElementById('mov-costo')?.value) || 0;
    const el = document.getElementById('mov-preview-amount');
    if (el) el.textContent = Utils.formatMoney(qty * costo);
  },
  async saveMovimiento(productoId) {
    const tipo = document.getElementById('mov-tipo').value;
    const cantidad = Number(document.getElementById('mov-cantidad').value);
    const costo = tipo === 'Entrada' ? Number(document.getElementById('mov-costo').value) : null;
    if (!Number.isInteger(cantidad) || cantidad <= 0) { Toast.show('Cantidad inválida', 'error'); return; }
    if (tipo === 'Entrada' && (!Number.isFinite(costo) || costo < 0)) { Toast.show('Costo inválido', 'error'); return; }
    const motivo = document.getElementById('mov-motivo')?.value || '';
    const p = Store.getProduct(productoId);
    return confirmAction(`${tipo}: ${cantidad} unidad(es) de ${p?.nombre || 'producto'}. ¿Confirmar movimiento?`, async () => {
    const res = await Store.addMovement({ productoId, tipo, cantidad, costoUnitario: costo, motivo });
    if (!res.ok) {
      Toast.show(res.error, 'error');
      return res;
    }
    Modal.close();
    Toast.show('Movimiento registrado' + (tipo === 'Entrada' && costo ? ' · Gasto generado' : ''));
    Router.go('productos');
    return res;
    }, {title:'Confirmar movimiento', confirmText:'Registrar', danger: ['Salida','Merma','Ajuste -'].includes(tipo), key:'mov:'+productoId});
  },

  // ---------- MOVIMIENTOS ----------
  movimientos() {
    if (!Auth.requireAdmin()) return '';
    const desde=Store.daysAgo(30), hasta=Store.today();
    const movs = [...Store.state.movements]
      .filter(m=>String(m.fecha||'')>=desde&&String(m.fecha||'')<=hasta)
      .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    return `
      <div class="page-header">
        <div><h1 class="page-title">🔄 Movimientos de inventario</h1><p class="ux-page-sub">Filtra por producto, tipo y rango de fechas.</p></div>
      </div>
      <div class="toolbar ux-filter-grid">
        <input type="search" class="search-input" id="mov-search" placeholder="🔎 Buscar producto..." oninput="Pages.filterMovimientos()" />
        <select class="filter-select" id="mov-type" onchange="Pages.filterMovimientos()">
          <option value="">Todos los movimientos</option><option value="Entrada">Entrada</option><option value="Salida">Salida</option><option value="Merma">Merma</option><option value="Ajuste +">Ajuste +</option><option value="Ajuste -">Ajuste -</option><option value="Venta">Venta</option><option value="Devolución">Devolución</option><option value="Eliminación">Eliminación</option>
        </select>
        <select class="filter-select" id="mov-journey" onchange="Pages.selectJourneyFilter('movimientos')">${this._journeyOptions()}</select>
        <label class="ux-date-filter">Desde<input type="date" id="mov-from" class="filter-select" value="${desde}" onchange="Pages.filterMovimientos(true)" /></label>
        <label class="ux-date-filter">Hasta<input type="date" id="mov-to" class="filter-select" value="${hasta}" onchange="Pages.filterMovimientos(true)" /></label>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Hora</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock ant.</th><th>Stock nuevo</th><th>Usuario</th></tr></thead>
          <tbody id="mov-tbody">${this._movRows(movs)}</tbody>
        </table>
      </div>
    `;
  },
  _movRows(movs) {
    if(!movs.length)return `<tr><td colspan="8">${Components.empty('📋', 'No hay movimientos para los filtros elegidos')}</td></tr>`;
    return movs.map(m => {
      const p = Store.getProduct(m.productoId);
      const u = Store.getUser(m.usuarioId);
      const tipoBadge = m.tipo === 'Venta' ? 'badge-accent' : m.tipo === 'Entrada' || m.tipo === 'Devolución' ? 'badge-success' : 'badge-warning';
      return `<tr>
        <td data-label="Fecha">${Utils.formatDate(m.fecha)}</td><td data-label="Hora">${Utils.formatTime(m.hora)}</td>
        <td data-label="Producto">${Utils.escapeHtml(p?.nombre || m.productoNombre || '—')}</td>
        <td data-label="Tipo"><span class="badge ${tipoBadge}">${Utils.escapeHtml(m.tipo || '—')}</span></td>
        <td data-label="Cantidad">${Number(m.cantidad||0)}</td><td data-label="Stock ant.">${Number(m.stockAnterior||0)}</td>
        <td data-label="Stock nuevo"><strong>${Number(m.stockNuevo||0)}</strong></td><td data-label="Usuario">${Utils.escapeHtml(u ? u.nombres : '—')}</td>
      </tr>`;
    }).join('');
  },
  async filterMovimientos(loadRange=false) {
    const q=(document.getElementById('mov-search')?.value||'').trim().toLowerCase();
    const type=document.getElementById('mov-type')?.value||'';
    const journeyId=document.getElementById('mov-journey')?.value||'';
    const desde=document.getElementById('mov-from')?.value||Store.daysAgo(30);
    const hasta=document.getElementById('mov-to')?.value||Store.today();
    if(desde>hasta)return Toast.show('La fecha Desde no puede ser posterior a Hasta','error');
    if(loadRange && Store.loadMovementsForRange) await Store.loadMovementsForRange(desde,hasta);
    const list=[...Store.state.movements].filter(m=>{
      const name=(Store.getProduct(m.productoId)?.nombre||m.productoNombre||'').toLowerCase();
      return String(m.fecha||'')>=desde&&String(m.fecha||'')<=hasta&&this._journeyMatches(m,journeyId)&&(!type||m.tipo===type)&&(!q||name.includes(q)||String(m.motivo||'').toLowerCase().includes(q));
    }).sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));
    const tbody=document.getElementById('mov-tbody');
    if(tbody){tbody.innerHTML=this._movRows(list);App.makeTablesMobileFriendly(tbody.closest('.table-wrap')||document);this._paginateRows('movimientos','mov-tbody',1);}
  },

  // ---------- GASTOS ----------
  gastos() {
    if (!Auth.requireAdmin()) return '';
    const desde=Store.daysAgo(30), hasta=Store.today();
    const expenses = [...Store.state.expenses].filter(e=>String(e.fecha||'')>=desde&&String(e.fecha||'')<=hasta).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    const periodTotal = expenses.reduce((s,e)=>s+Number(e.monto||0),0);
    const todayTotal = Store.expensesToday().reduce((s,e)=>s+Number(e.monto||0),0);
    return `
      <div class="page-header">
        <div><h1 class="page-title">💸 Gastos</h1><p class="ux-page-sub">Registra, edita y consulta tus gastos. Las compras de inventario se registran automáticamente para mantener el control.</p></div>
        <button class="btn btn-primary" onclick="Pages.openGastoForm()">➕ Nuevo gasto</button>
      </div>
      <div class="stat-cards ux-filter-summary" style="margin-bottom:1.25rem">
        <div class="stat-card amber ux-live-total"><div class="stat-label">💸 Total de gastos en este filtro</div><div class="stat-value amber" id="gasto-total">${Utils.formatMoney(periodTotal)}</div><div class="stat-sub" id="gasto-range-label">${desde===hasta?`Fecha: ${Utils.formatDate(desde)}`:`Rango: ${Utils.formatDate(desde)} → ${Utils.formatDate(hasta)}`}</div></div>
        <div class="stat-card"><div class="stat-label">🧾 Resultados</div><div class="stat-value" id="gasto-count">${expenses.length}</div><div class="stat-sub">registro(s) que cumplen los filtros</div></div>
        <div class="stat-card"><div class="stat-label">📅 Gastos de hoy</div><div class="stat-value">${Utils.formatMoney(todayTotal)}</div><div class="stat-sub">Referencia del día actual</div></div>
      </div>
      <div class="toolbar ux-filter-grid">
        <input type="search" class="search-input" id="gasto-search" placeholder="🔎 Buscar concepto..." oninput="Pages.queueGastoFilter()" />
        <select class="filter-select" id="gasto-cat-filter" onchange="Pages.filterGastos()">
          <option value="">Todas las categorías</option><option value="Stock">Compra de stock</option><option value="Alquiler">Alquiler</option><option value="Servicios">Servicios</option><option value="Personal">Personal</option><option value="Mantenimiento">Mantenimiento</option><option value="Otros">Otros</option>
        </select>
        <select class="filter-select" id="gasto-origin-filter" onchange="Pages.filterGastos()"><option value="">Todos los orígenes</option><option value="Manual">Manual</option><option value="auto">Inventario automático</option></select>
        <select class="filter-select" id="gasto-journey" onchange="Pages.selectJourneyFilter('gastos')">${this._journeyOptions()}</select>
        <label class="ux-date-filter">Desde<input type="date" id="gasto-from" class="filter-select" value="${desde}" onchange="Pages.filterGastos(true)" /></label>
        <label class="ux-date-filter">Hasta<input type="date" id="gasto-to" class="filter-select" value="${hasta}" onchange="Pages.filterGastos(true)" /></label>
      </div>
      <div class="ux-filter-actions"><span>⚡ El total se actualiza automáticamente al cambiar cualquier filtro.</span><button class="btn btn-sm btn-secondary" onclick="Pages.resetGastoFilters()">↺ Limpiar filtros</button></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Hora</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th>Pago</th><th>Origen</th><th>Usuario</th><th>Acciones</th></tr></thead>
          <tbody id="gasto-tbody">${this._gastoRows(expenses)}</tbody>
        </table>
      </div>
    `;
  },
  _gastoRows(list) {
    if (!list.length) return `<tr><td colspan="9">${Components.empty('💸', 'No hay gastos para los filtros elegidos')}</td></tr>`;
    return list.map(e => {
      const u = Store.getUser(e.usuarioId);
      const manual=String(e.origen||'Manual')==='Manual';
      return `<tr>
        <td data-label="Fecha">${Utils.formatDate(e.fecha)}</td><td data-label="Hora">${Utils.formatTime(e.hora)}</td>
        <td data-label="Concepto">${Utils.escapeHtml(e.concepto||'—')}</td>
        <td data-label="Categoría"><span class="badge badge-neutral">${Utils.escapeHtml(e.categoria||'Otros')}</span></td>
        <td data-label="Monto" style="color:var(--amber);font-weight:600">${Utils.formatMoney(e.monto)}</td>
        <td data-label="Pago">${Utils.escapeHtml(e.metodoPago||'Otro')}</td>
        <td data-label="Origen">${manual?'<span class="badge badge-accent">✍️ Manual</span>':'<span class="badge badge-success">📦 Inventario</span>'}</td>
        <td data-label="Usuario">${Utils.escapeHtml(u ? u.nombres : (e.usuarioNombre||'—'))}</td>
        <td data-label="Acciones" class="table-actions"><button class="btn btn-sm btn-secondary" onclick="Pages.openGastoForm('${e.id}')">✏️ Editar</button><button class="btn btn-sm btn-danger" onclick="Pages.deleteGasto('${e.id}')">🗑️ Eliminar</button></td>
      </tr>`;
    }).join('');
  },
  _applyGastoFilters({syncing=false}={}) {
    const desde=document.getElementById('gasto-from')?.value||Store.daysAgo(30);
    const hasta=document.getElementById('gasto-to')?.value||Store.today();
    if(desde>hasta){Toast.show('La fecha Desde no puede ser posterior a Hasta','error');return null;}
    const q=(document.getElementById('gasto-search')?.value||'').trim().toLowerCase();
    const cat=document.getElementById('gasto-cat-filter')?.value||'';
    const origin=document.getElementById('gasto-origin-filter')?.value||'';
    const journeyId=document.getElementById('gasto-journey')?.value||'';
    const list=[...Store.state.expenses].filter(e=>{
      const auto=String(e.origen||'Manual')!=='Manual';
      return String(e.fecha||'')>=desde&&String(e.fecha||'')<=hasta&&this._journeyMatches(e,journeyId)&&(!q||String(e.concepto||'').toLowerCase().includes(q))&&(!cat||e.categoria===cat)&&(!origin||(origin==='Manual'?!auto:auto));
    }).sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));

    // Actualizar primero las cifras. Aunque falle un detalle visual de la tabla,
    // el cliente siempre ve el total correcto del filtro seleccionado.
    const total=list.reduce((sum,e)=>sum+Number(e.monto||0),0);
    const totalEl=document.getElementById('gasto-total');
    const rangeEl=document.getElementById('gasto-range-label');
    const countEl=document.getElementById('gasto-count');
    if(totalEl){totalEl.classList.remove('ux-value-loading');totalEl.textContent=Utils.formatMoney(total);totalEl.title=syncing?'Sincronizando con Firebase…':'';}
    if(rangeEl){const j=Store.state.jornadas.find(x=>x.id===journeyId);rangeEl.textContent=`${j?`Jornada: ${j.numero||Store.journeyNumber(j.id)} · `:''}${desde===hasta?`Fecha: ${Utils.formatDate(desde)}`:`Rango: ${Utils.formatDate(desde)} → ${Utils.formatDate(hasta)}`}${syncing?' · sincronizando…':''}`;}
    if(countEl)countEl.textContent=String(list.length);

    const tbody=document.getElementById('gasto-tbody');
    if(tbody){
      tbody.innerHTML=this._gastoRows(list);
      try{App.makeTablesMobileFriendly(tbody.closest('.table-wrap')||document);}catch(e){console.warn('Tabla móvil gastos:',e);}
      try{this._paginateRows('gastos','gasto-tbody',1);}catch(e){console.warn('Paginación gastos:',e);}
    }
    return {desde,hasta,list,total};
  },
  async filterGastos(loadRange=false) {
    const current=this._applyGastoFilters({syncing:!!loadRange});
    if(!current||!loadRange||!Store.loadExpensesForRange)return;
    const seq=(this._gastoFilterSeq||0)+1;this._gastoFilterSeq=seq;
    const loaded=await Store.loadExpensesForRange(current.desde,current.hasta);
    if(seq!==this._gastoFilterSeq)return;
    if(!loaded?.ok){Toast.show(loaded?.error||'No se pudieron cargar los gastos del rango','error');return this._applyGastoFilters();}
    this._applyGastoFilters();
  },
  resetGastoFilters() {
    const q=document.getElementById('gasto-search'),cat=document.getElementById('gasto-cat-filter'),origin=document.getElementById('gasto-origin-filter'),journey=document.getElementById('gasto-journey'),from=document.getElementById('gasto-from'),to=document.getElementById('gasto-to');
    if(q)q.value='';if(cat)cat.value='';if(origin)origin.value='';if(journey)journey.value='';if(from)from.value=Store.daysAgo(30);if(to)to.value=Store.today();
    this.filterGastos(true);
  },
  openGastoForm(id='') {
    const e=id?Store.state.expenses.find(x=>x.id===id):null;

    Modal.open(`
      <div class="modal-header"><h2>${e?'✏️ Editar gasto':'➕ Nuevo gasto'}</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Concepto / descripción *</label><input type="text" id="gasto-concepto" required placeholder="Ej. Pago de luz" value="${Utils.escapeHtml(e?.concepto||'')}" /></div>
        <div class="form-group"><label>Categoría *</label><select id="gasto-categoria">
          ${['Stock','Alquiler','Servicios','Personal','Mantenimiento','Otros'].map(c=>`<option value="${c}" ${e?.categoria===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Monto (S/) *</label><input type="number" id="gasto-monto" step="0.01" min="0.01" required value="${e?Number(e.monto||0).toFixed(2):''}" /></div>
        <div class="form-group"><label>¿Cómo se pagó? *</label><select id="gasto-metodo">${['Efectivo','Yape','Plin','Tarjeta','Otro'].map(m=>`<option value="${m}" ${(e?.metodoPago||'Otro')===m?'selected':''}>${m}</option>`).join('')}</select><small class="ux-help">Si eliges Efectivo y hay una jornada abierta, este gasto se descontará del efectivo esperado al cierre.</small></div>
        <p style="font-size:0.8rem;color:var(--text-muted)">${e?'Se conservarán la fecha, hora, origen, usuario y movimientos de inventario originales. La edición quedará auditada.':'La fecha y hora se registran automáticamente al confirmar. Si hay una jornada abierta, el gasto quedará vinculado a ella.'}</p>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="Pages.saveGasto('${id}')">${e?'Guardar cambios':'Registrar'}</button></div>
    `);
  },
  async saveGasto(id='') {
    const concepto=(document.getElementById('gasto-concepto')?.value||'').trim();
    const categoria=document.getElementById('gasto-categoria')?.value||'Otros';
    const monto=Number(document.getElementById('gasto-monto')?.value);
    const metodoPago=document.getElementById('gasto-metodo')?.value||'Otro';
    if(!concepto||!Number.isFinite(monto)||monto<=0)return Toast.show('Completa concepto y monto válido','error');
    return confirmAction(`${id?'Guardar cambios del gasto':'Registrar el gasto'} “${concepto}” por ${Utils.formatMoney(monto)} (${metodoPago}). ¿Confirmar?`,async()=>{
      const r=id?await Store.updateExpense(id,{concepto,categoria,monto,metodoPago}):await Store.addExpense({concepto,categoria,monto,metodoPago});
      if(!r.ok){Toast.show(r.error||'No se pudo guardar el gasto','error');return r;}
      Modal.close();Toast.show(id?'Gasto actualizado':'Gasto registrado');Router.go('gastos');return r;
    },{title:id?'Confirmar edición':'Confirmar gasto',confirmText:id?'Guardar cambios':'Registrar gasto',danger:false,key:'gasto:'+id});
  },
  deleteGasto(id) {
    const e=Store.state.expenses.find(x=>x.id===id);if(!e)return Toast.show('Gasto no encontrado','error');
    confirmAction(`Eliminar el gasto “${e.concepto||''}” por ${Utils.formatMoney(e.monto)}. Se archivará el gasto para auditoría; los movimientos de stock originales se conservarán.`,async()=>{
      const r=await Store.deleteExpense(id);Toast.show(r.ok?'Gasto eliminado':r.error,r.ok?'success':'error');if(r.ok){Modal.close();Router.go('gastos')}return r;
    },{title:'Eliminar gasto',confirmText:'Eliminar',danger:true,key:'delete-expense:'+id});
  },

  // ---------- VENTAS (Nueva venta) ----------
  ventas() {
    const products = Store.state.products.filter(p => p.estado === 'Activo');
    const cart = Store.state.cart;
    const total = Store.getCartTotal();

    return `
      <div class="page-header">
        <h1 class="page-title">Nueva venta</h1>
      </div>
      <div class="sales-layout">
        <div>
          <div class="toolbar">
            <input type="search" class="search-input" id="sale-search" placeholder="Buscar por nombre, categoría o código..." autocomplete="off" oninput="Pages.filterSaleProducts()" style="max-width:100%" />
          </div>
          <div class="product-grid" id="sale-products">
            ${products.map(p => this._saleProductCard(p)).join('') || Components.empty('📦', 'No hay productos disponibles')}
          </div>
        </div>
        <div class="cart-panel" id="cart-panel">
          <h3 style="margin-bottom:1rem;font-size:1.1rem">🛒 Carrito</h3>
          <div id="cart-items">
            ${cart.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;padding:1rem 0">El carrito está vacío</p>' :
              cart.map(item => {
                const p = Store.getProduct(item.productoId);
                if (!p) return '';
                return `
                  <div class="cart-item">
                    <div class="cart-item-info">
                      <div class="cart-item-name">${Utils.escapeHtml(p.nombre)}</div>
                      <div class="cart-item-price">${Utils.formatMoney(p.precioVenta)} c/u</div>
                    </div>
                    <div class="qty-controls">
                      <button class="qty-btn" onclick="Pages.changeCartQty('${p.id}', -1)">−</button>
                      <span style="min-width:1.5rem;text-align:center">${item.cantidad}</span>
                      <button class="qty-btn" onclick="Pages.changeCartQty('${p.id}', 1)">+</button>
                    </div>
                    <div style="min-width:70px;text-align:right;color:var(--amber);font-weight:600">${Utils.formatMoney(p.precioVenta * item.cantidad)}</div>
                    <button class="btn-icon" style="font-size:0.9rem" onclick="Pages.removeCartItem('${p.id}')" title="Quitar">🗑</button>
                  </div>`;
              }).join('')}
          </div>
          <div class="cart-total">
            <span class="cart-total-label">Total</span>
            <span class="cart-total-value">${Utils.formatMoney(total)}</span>
          </div>
          <button class="btn btn-amber btn-full ux-checkout-btn" 
            ${cart.length === 0 ? 'disabled' : ''} onclick="Pages.openPago()">
            Cobrar ${cart.length ? '· ' + Utils.formatMoney(total) : ''}
          </button>
        </div>
      </div>
    `;
  },
  _saleProductCard(p) {
    const disabled = p.stock <= 0;
    return `
      <div class="product-card ${disabled ? 'disabled' : ''}" ${disabled ? '' : `onclick="Pages.addProductToCart('${p.id}')"`}>
        <div class="pc-img">${Utils.escapeHtml(p.imagen || '📦')}</div>
        <div class="pc-name">${Utils.escapeHtml(p.nombre)}</div>
        <div class="pc-cat">${Utils.escapeHtml(Store.getCategory(p.categoriaId)?.nombre || '')}</div>
        <div class="pc-price">${Utils.formatMoney(p.precioVenta)}</div>
        <div class="pc-stock">${disabled ? '<span class="badge badge-danger">AGOTADO</span>' : `Stock: ${p.stock}`}</div>
        <button class="btn btn-sm ${disabled ? 'btn-secondary' : 'btn-primary'}" ${disabled ? 'disabled' : ''} 
          onclick="event.stopPropagation();Pages.addProductToCart('${p.id}')">
          ${disabled ? 'Agotado' : 'Agregar'}
        </button>
      </div>
    `;
  },
  filterSaleProducts() {
    const q = (document.getElementById('sale-search')?.value || '');
    const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
    const needle = norm(q.trim());
    const products = Store.state.products.filter(p => p.estado === 'Activo' && (!needle || [p.nombre, p.codigo, p.sku, p.codigoBarras, Store.getCategory(p.categoriaId)?.nombre].some(v => norm(v).includes(needle))));
    const grid = document.getElementById('sale-products');
    if (grid) grid.innerHTML = products.map(p => this._saleProductCard(p)).join('') || Components.empty('📦', 'Sin resultados');
  },
  addProductToCart(id) {
    const res = Store.addToCart(id, 1);
    if (!res.ok) {
      Toast.show(res.error, 'error');
      return;
    }
    Toast.show('Agregado al carrito');
    this._refreshCartUI();
    App.updateCartBadge();
  },
  changeCartQty(id, delta) {
    const item = Store.state.cart.find(c => c.productoId === id);
    if (!item) return;
    const newQty = item.cantidad + delta;
    const res = Store.updateCartQty(id, newQty);
    if (!res.ok) {
      Toast.show(res.error, 'error');
      return;
    }
    this._refreshCartUI();
    App.updateCartBadge();
  },
  removeCartItem(id) {
    Store.removeFromCart(id);
    this._refreshCartUI();
    App.updateCartBadge();
  },
  _refreshCartUI() {
    // Re-render only the sales page if we are on it
    if (Router.current === 'ventas') {
      const previousSearch = document.getElementById('sale-search')?.value || '';
      document.getElementById('main-content').innerHTML = this.ventas();
      const search = document.getElementById('sale-search');
      if (search && previousSearch) { search.value = previousSearch; this.filterSaleProducts(); }
    }
  },
  openPago() {
    const total = Store.getCartTotal();
    if (Store.state.cart.length === 0) return;
    const u = Auth.currentUser();
    const cajaAbierta = Store.state.cashSessions.find(c => c.usuarioId === u.id && c.estado === 'Abierta');
    if (!cajaAbierta) {
      Modal.open(`<div class="modal-header"><h2>⚠️ No hay jornada abierta</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div><div class="modal-body"><p>Antes de registrar una venta debes <strong>abrir una jornada</strong>. La jornada y su caja seguirán activas aunque pase medianoche hasta que las finalices manualmente.</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="Modal.close();Router.go('caja')">Ir a Jornada y Caja</button></div>`);
      return;
    }
    const half=+(total/2).toFixed(2), rest=+(total-half).toFixed(2);
    Modal.open(`
      <div class="modal-header"><h2>💰 Confirmar pago</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <p style="text-align:center;margin-bottom:0.5rem;color:var(--text-secondary)">Total a cobrar</p>
        <p style="text-align:center;font-family:var(--font-serif);font-size:2rem;color:var(--amber);margin-bottom:1.25rem">${Utils.formatMoney(total)}</p>
        <div id="single-pay-area">
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.5rem">Método de pago</p>
          <div class="pay-methods">
            <div class="pay-method selected" data-method="Efectivo" onclick="Pages.selectPayMethod(this)"><span class="pm-icon">💵</span><span class="pm-label">Efectivo</span></div>
            <div class="pay-method" data-method="Yape" onclick="Pages.selectPayMethod(this)"><span class="pm-icon">📱</span><span class="pm-label">Yape</span></div>
            <div class="pay-method" data-method="Plin" onclick="Pages.selectPayMethod(this)"><span class="pm-icon">📲</span><span class="pm-label">Plin</span></div>
            <div class="pay-method" data-method="Tarjeta" onclick="Pages.selectPayMethod(this)"><span class="pm-icon">💳</span><span class="pm-label">Tarjeta</span></div>
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-full ux-split-toggle" id="split-toggle" onclick="Pages.toggleSplitPayment()">➗ Pago por separado</button>
        <div id="split-pay-area" class="hidden ux-split-pay-box">
          <div class="ux-split-title">➗ Dividir en 2 partes</div>
          <div class="ux-split-row">
            <div class="form-group"><label>Primera parte</label><select id="split-method-1" onchange="Pages.updateSplitPayment()"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Tarjeta</option></select></div>
            <div class="form-group"><label>Monto</label><input id="split-amount-1" type="number" min="0.01" max="${total.toFixed(2)}" step="0.01" value="${half.toFixed(2)}" oninput="Pages.updateSplitPayment()" /></div>
          </div>
          <div class="ux-split-row">
            <div class="form-group"><label>Segunda parte</label><select id="split-method-2" onchange="Pages.updateSplitPayment()"><option>Yape</option><option>Plin</option><option>Tarjeta</option><option>Efectivo</option></select></div>
            <div class="form-group"><label>Monto restante</label><input id="split-amount-2" type="number" value="${rest.toFixed(2)}" readonly /></div>
          </div>
          <div class="ux-split-check" id="split-check">✅ Las dos partes suman ${Utils.formatMoney(total)}</div>
        </div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-amber" id="btn-confirm-pay" onclick="Pages.confirmPago()">💳 Confirmar pago</button></div>
    `);
  },
  selectPayMethod(el) {
    document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
  },
  toggleSplitPayment() {
    const area=document.getElementById('split-pay-area'),single=document.getElementById('single-pay-area'),btn=document.getElementById('split-toggle');
    const enabling=area?.classList.contains('hidden');
    area?.classList.toggle('hidden',!enabling);single?.classList.toggle('hidden',enabling);
    if(btn)btn.textContent=enabling?'↩️ Usar un solo método':'➗ Pago por separado';
    if(enabling)this.updateSplitPayment();
  },
  updateSplitPayment() {
    const total=Store.getCartTotal(),raw=Number(document.getElementById('split-amount-1')?.value||0),a1=Number.isFinite(raw)?+raw.toFixed(2):0;
    const a2=+(total-a1).toFixed(2),el2=document.getElementById('split-amount-2'),check=document.getElementById('split-check');
    if(el2)el2.value=Math.max(0,a2).toFixed(2);
    const m1=document.getElementById('split-method-1')?.value,m2=document.getElementById('split-method-2')?.value;
    const ok=Number.isFinite(a1)&&a1>0&&a2>0&&m1&&m2&&m1!==m2;
    if(check){check.className='ux-split-check '+(ok?'is-ok':'is-bad');check.textContent=ok?`✅ Total correcto: ${Utils.formatMoney(a1)} + ${Utils.formatMoney(a2)} = ${Utils.formatMoney(total)}`:(m1===m2?'⚠️ Selecciona dos métodos diferentes':'⚠️ Ambas partes deben ser mayores a S/ 0.00');}
    return ok;
  },
  confirmPago() {
    const splitArea=document.getElementById('split-pay-area');
    const split=splitArea&&!splitArea.classList.contains('hidden');
    const total=Store.getCartTotal();
    if(split){
      if(!this.updateSplitPayment())return Toast.show('Revisa los métodos y montos del pago por separado','error');
      const p1={metodo:document.getElementById('split-method-1').value,monto:+Number(document.getElementById('split-amount-1').value).toFixed(2)};
      const p2={metodo:document.getElementById('split-method-2').value,monto:+Number(document.getElementById('split-amount-2').value).toFixed(2)};
      return confirmAction(`Cobrar ${Utils.formatMoney(total)} en 2 partes: ${p1.metodo} ${Utils.formatMoney(p1.monto)} + ${p2.metodo} ${Utils.formatMoney(p2.monto)}. ¿Confirmar venta?`,async()=>Pages._confirmPagoNow([p1,p2]),{title:'Confirmar pago por separado',confirmText:'Cobrar',danger:false,key:'venta'});
    }
    const selected=document.querySelector('.pay-method.selected'),method=selected?.getAttribute('data-method')||'Efectivo';
    confirmAction(`Cobrar ${Utils.formatMoney(total)} mediante ${method}. ¿Confirmar venta?`,async()=>Pages._confirmPagoNow(method),{title:'Confirmar venta',confirmText:'Cobrar',danger:false,key:'venta'});
  },
  async _confirmPagoNow(paymentInput) {
    const res = await Store.confirmSale(paymentInput);
    if (!res.ok) { Toast.show(res.error, 'error'); return res; }
    SetupGuide.mark('saleDone');Modal.close();App.updateCartBadge();
    const s=res.sale;
    Modal.open(`<div class="modal-body"><div class="sale-success"><div class="ss-icon">✅</div><h2>¡Venta registrada!</h2><p class="ss-meta">N° ${Utils.escapeHtml(s.numero||s.id)}</p><div class="ss-total">Venta guardada correctamente</div><p class="ss-meta">Pago: ${Utils.escapeHtml(Store.salePaymentLabel(s))}</p><div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem"><button class="btn btn-primary" onclick="Modal.close();Router.go('ventas')">🛒 Nueva venta</button><button class="btn btn-secondary" onclick="Modal.close();Router.go('historial')">🧾 Ver historial</button></div></div></div>`);
    return res;
  },

  // ---------- HISTORIAL VENTAS ----------
  historial() {
    const user=Auth.currentUser(),desde=Store.daysAgo(30),hasta=Store.today();
    let sales=[...Store.state.sales].filter(s=>String(s.fecha||'')>=desde&&String(s.fecha||'')<=hasta);
    if(Auth.isEmployee())sales=sales.filter(s=>s.empleadoId===user.id);
    sales.sort((a,b)=>(b.fecha+b.hora).localeCompare(a.fecha+a.hora));
    const valid=sales.filter(x=>x.estado!=='Anulada'),annulled=sales.filter(x=>x.estado==='Anulada'),total=valid.reduce((sum,x)=>sum+Number(x.total||0),0);
    return `
      <div class="page-header"><div><h1 class="page-title">🧾 ${Auth.isAdmin()?'Historial de ventas':'Mis ventas'}</h1><p class="ux-page-sub">Filtra por fecha, método o búsqueda. El monto se recalcula automáticamente con los resultados del filtro.</p></div></div>
      <div class="stat-cards ux-filter-summary" style="margin-bottom:1.25rem">
        <div class="stat-card ux-live-total"><div class="stat-label" id="hist-total-label">💰 Total vendido en este filtro</div><div class="stat-value amber" id="hist-total">${Utils.formatMoney(total)}</div><div class="stat-sub" id="hist-range-label">${desde===hasta?`Fecha: ${Utils.formatDate(desde)}`:`Rango: ${Utils.formatDate(desde)} → ${Utils.formatDate(hasta)}`}</div></div>
        <div class="stat-card"><div class="stat-label">🧾 Resultados</div><div class="stat-value" id="hist-count">${valid.length}</div><div class="stat-sub"><span id="hist-valid-label">${valid.length} completada(s)</span> · <span id="hist-annulled-label">${annulled.length} anulada(s)</span></div></div>
      </div>
      <div class="toolbar ux-filter-grid">
        <input type="search" class="search-input" id="hist-search" placeholder="🔎 Buscar..." oninput="Pages.queueHistorialFilter()" />
        <select class="filter-select" id="hist-method" onchange="Pages.filterHistorial()"><option value="">Todos los métodos</option><option value="Efectivo">Efectivo</option><option value="Yape">Yape</option><option value="Plin">Plin</option><option value="Tarjeta">Tarjeta</option></select>
        <select class="filter-select" id="hist-journey" onchange="Pages.selectJourneyFilter('historial')">${this._journeyOptions()}</select>
        <label class="ux-date-filter">Desde<input type="date" id="hist-from" class="filter-select" value="${desde}" onchange="Pages.filterHistorial(true)" /></label>
        <label class="ux-date-filter">Hasta<input type="date" id="hist-to" class="filter-select" value="${hasta}" onchange="Pages.filterHistorial(true)" /></label>
      </div>
      <div class="ux-filter-actions"><span>⚡ El monto superior siempre corresponde a lo que estás viendo con estos filtros.</span><button class="btn btn-sm btn-secondary" onclick="Pages.resetHistFilters()">↺ Limpiar filtros</button></div>
      <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Hora</th><th>Empleado</th><th>Productos</th><th>Total</th><th>Método</th><th>Estado</th><th></th></tr></thead><tbody id="hist-tbody">${this._histRows(sales)}</tbody></table></div>
    `;
  },
  _histRows(sales) {
    if(!sales.length)return `<tr><td colspan="8">${Components.empty('🧾','No hay ventas para los filtros elegidos')}</td></tr>`;
    return sales.map(s=>{
      const emp=Store.getUser(s.empleadoId),items=Array.isArray(s.items)?s.items:[];
      const prodSummary=items.map(i=>`${Store.getProduct(i.productoId)?.nombre||i?.nombre||'?'} ×${Number(i?.cantidad||0)}`).join(', ');
      return `<tr><td data-label="Fecha">${Utils.formatDate(s.fecha)}</td><td data-label="Hora">${Utils.formatTime(s.hora)}</td><td data-label="Empleado">${Utils.escapeHtml(emp?`${emp.nombres} ${emp.apellidos}`:(s.empleadoNombre||'—'))}</td><td data-label="Productos" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${Utils.escapeHtml(prodSummary)}">${Utils.escapeHtml(prodSummary)}</td><td data-label="Total" style="color:var(--amber);font-weight:600">${Utils.formatMoney(s.total)}</td><td data-label="Método">${Utils.escapeHtml(Store.salePaymentLabel(s))}</td><td data-label="Estado">${s.estado==='Anulada'?'<span class="badge badge-danger">Anulada</span>':'<span class="badge badge-success">Completada</span>'}</td><td data-label="Acciones"><button class="btn btn-sm btn-secondary" onclick="Pages.showSaleDetail('${s.id}')">👁️ Ver</button> ${Auth.isAdmin()&&s.estado!=='Anulada'?`<button class="btn btn-sm btn-danger" onclick="Pages.anularVenta('${s.id}')">Anular</button>`:''}</td></tr>`;
    }).join('');
  },
  _applyHistorialFilters({syncing=false}={}) {
    const desde=document.getElementById('hist-from')?.value||Store.daysAgo(30);
    const hasta=document.getElementById('hist-to')?.value||Store.today();
    if(desde>hasta){Toast.show('La fecha Desde no puede ser posterior a Hasta','error');return null;}
    const method=(document.getElementById('hist-method')?.value||'').trim();
    const journeyId=document.getElementById('hist-journey')?.value||'';
    const q=(document.getElementById('hist-search')?.value||'').trim().toLowerCase();
    const user=Auth.currentUser();
    let sales=[...Store.state.sales];
    if(Auth.isEmployee())sales=sales.filter(s=>s.empleadoId===user.id);
    sales=sales.filter(s=>{
      const emp=Store.getUser(s.empleadoId);
      const products=(Array.isArray(s.items)?s.items:[]).map(i=>Store.getProduct(i.productoId)?.nombre||i?.nombre||'').join(' ');
      const haystack=`${s.numero||s.id||''} ${emp?.nombres||s.empleadoNombre||''} ${emp?.apellidos||''} ${products} ${Store.salePaymentLabel(s)}`.toLowerCase();
      const methods=Store.getSalePayments(s).map(p=>p.metodo);
      return String(s.fecha||'')>=desde&&String(s.fecha||'')<=hasta&&this._journeyMatches(s,journeyId)&&(!method||methods.includes(method))&&(!q||haystack.includes(q));
    }).sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));

    const valid=sales.filter(s=>s.estado!=='Anulada');
    const annulled=sales.filter(s=>s.estado==='Anulada');
    const total=valid.reduce((sum,s)=>{
      if(!method)return sum+Number(s.total||0);
      return sum+Store.getSalePayments(s).filter(p=>p.metodo===method).reduce((a,p)=>a+Number(p.monto||0),0);
    },0);

    // Las métricas se pintan ANTES que la tabla para que nunca queden en
    // "Actualizando…" por un error visual secundario.
    const totalEl=document.getElementById('hist-total');
    const rangeEl=document.getElementById('hist-range-label');
    const countEl=document.getElementById('hist-count');
    const validEl=document.getElementById('hist-valid-label');
    const annulledEl=document.getElementById('hist-annulled-label');
    const labelEl=document.getElementById('hist-total-label');
    if(totalEl){totalEl.classList.remove('ux-value-loading');totalEl.textContent=Utils.formatMoney(total);totalEl.title=syncing?'Sincronizando con Firebase…':'';}
    if(labelEl)labelEl.textContent=method?`💰 Total cobrado en ${method}`:'💰 Total vendido en este filtro';
    if(rangeEl){const j=Store.state.jornadas.find(x=>x.id===journeyId);rangeEl.textContent=`${j?`Jornada: ${j.numero||Store.journeyNumber(j.id)} · `:''}${desde===hasta?`Fecha: ${Utils.formatDate(desde)}`:`Rango: ${Utils.formatDate(desde)} → ${Utils.formatDate(hasta)}`}${method?' · en pagos separados se suma solo ese método':''}${syncing?' · sincronizando…':''}`;}
    if(countEl)countEl.textContent=String(sales.length);
    if(validEl)validEl.textContent=`${valid.length} completada(s)`;
    if(annulledEl)annulledEl.textContent=`${annulled.length} anulada(s)`;

    const tbody=document.getElementById('hist-tbody');
    if(tbody){
      tbody.innerHTML=this._histRows(sales);
      try{App.makeTablesMobileFriendly(tbody.closest('.table-wrap')||document);}catch(e){console.warn('Tabla móvil historial:',e);}
      try{this._paginateRows('historial','hist-tbody',1);}catch(e){console.warn('Paginación historial:',e);}
    }
    return {desde,hasta,method,sales,total};
  },
  async filterHistorial(loadRange=false) {
    const current=this._applyHistorialFilters({syncing:!!loadRange});
    if(!current||!loadRange||!Store.loadSalesForRange)return;
    const seq=(this._histFilterSeq||0)+1;this._histFilterSeq=seq;
    const loaded=await Store.loadSalesForRange(current.desde,current.hasta);
    if(seq!==this._histFilterSeq)return;
    if(!loaded?.ok){Toast.show(loaded?.error||'No se pudieron cargar las ventas del rango','error');return this._applyHistorialFilters();}
    this._applyHistorialFilters();
  },
  resetHistFilters() {
    const q=document.getElementById('hist-search'),method=document.getElementById('hist-method'),journey=document.getElementById('hist-journey'),from=document.getElementById('hist-from'),to=document.getElementById('hist-to');
    if(q)q.value='';if(method)method.value='';if(journey)journey.value='';if(from)from.value=Store.daysAgo(30);if(to)to.value=Store.today();
    this.filterHistorial(true);
  },
  showSaleDetail(id) {
    const s=Store.state.sales.find(x=>x.id===id);if(!s)return;
    const emp=Store.getUser(s.empleadoId),pagos=Store.getSalePayments(s);
    Modal.open(`
      <div class="modal-header"><h2>🧾 Detalle de venta ${Utils.escapeHtml(s.numero||s.id)}</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="detail-row"><span class="dr-label">Fecha</span><span class="dr-value">${Utils.formatDate(s.fecha)} ${Utils.formatTime(s.hora)}</span></div>
        <div class="detail-row"><span class="dr-label">Empleado</span><span class="dr-value">${Utils.escapeHtml(emp?`${emp.nombres} ${emp.apellidos}`:(s.empleadoNombre||'—'))}</span></div>
        <div class="detail-row"><span class="dr-label">Jornada</span><span class="dr-value">${Utils.escapeHtml((()=>{const j=Store.state.jornadas.find(x=>x.id===(s.jornadaId||s.cajaId));return j?.numero||Store.journeyNumber(s.jornadaId||s.cajaId)||'—'})())}</span></div>
        <div class="detail-row"><span class="dr-label">Pago</span><span class="dr-value">${Utils.escapeHtml(Store.salePaymentLabel(s))}</span></div>
        ${pagos.length>1?`<div class="ux-payment-detail">${pagos.map(p=>`<span>${Utils.escapeHtml(p.metodo)} <strong>${Utils.formatMoney(p.monto)}</strong></span>`).join('')}</div>`:''}
        <h4 style="margin:1.25rem 0 0.75rem;font-size:0.95rem">📦 Productos</h4>
        <div class="table-wrap"><table><thead><tr><th>Producto</th><th>Cant.</th><th>P. unit.</th><th>Subtotal</th></tr></thead><tbody>${(Array.isArray(s.items)?s.items:[]).map(i=>`<tr><td data-label="Producto">${Utils.escapeHtml(Store.getProduct(i.productoId)?.nombre||i?.nombre||'—')}</td><td>${Number(i?.cantidad||0)}</td><td>${Utils.formatMoney(i?.precioUnitario)}</td><td style="color:var(--amber)">${Utils.formatMoney(i?.subtotal)}</td></tr>`).join('')}</tbody></table></div>
        <div style="text-align:right;margin-top:1rem;font-family:var(--font-serif);font-size:1.3rem;color:var(--amber)">Total: ${Utils.formatMoney(s.total)}</div>
      </div><div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button></div>`);
  },

  // ---------- PRODUCTOS DISPONIBLES (empleado) ----------
  productosDisponibles() {
    const products = Store.state.products.filter(p => p.estado === 'Activo');
    return `
      <div class="page-header">
        <h1 class="page-title">📦 Inventario disponible</h1>
      </div>
      <div class="toolbar">
        <input type="search" class="search-input" id="pd-search" placeholder="Buscar..." oninput="Pages.filterPD()" style="max-width:100%" />
      </div>
      <div class="product-grid" id="pd-grid">
        ${products.map(p => `
          <div class="product-card" style="cursor:default">
            <div class="pc-img">${Utils.escapeHtml(p.imagen || '📦')}</div>
            <div class="pc-name">${Utils.escapeHtml(p.nombre)}</div>
            <div class="pc-cat">${Utils.escapeHtml(Store.getCategory(p.categoriaId)?.nombre || '')}</div>
            <div class="pc-price">${Utils.formatMoney(p.precioVenta)}</div>
            <div class="pc-stock">${p.stock <= 0 ? '<span class="badge badge-danger">AGOTADO</span>' : `Stock: ${p.stock}`} ${Components.stockStatusBadge(p)}</div>
          </div>
        `).join('') || Components.empty('📦', 'No hay productos')}
      </div>
    `;
  },
  filterPD() {
    const q = (document.getElementById('pd-search')?.value || '').toLowerCase();
    const products = Store.state.products.filter(p => p.estado === 'Activo' && (!q || p.nombre.toLowerCase().includes(q)));
    const grid = document.getElementById('pd-grid');
    if (grid) {
      grid.innerHTML = products.map(p => `
        <div class="product-card" style="cursor:default">
          <div class="pc-img">${Utils.escapeHtml(p.imagen || '📦')}</div>
          <div class="pc-name">${Utils.escapeHtml(p.nombre)}</div>
          <div class="pc-cat">${Utils.escapeHtml(Store.getCategory(p.categoriaId)?.nombre || '')}</div>
          <div class="pc-price">${Utils.formatMoney(p.precioVenta)}</div>
          <div class="pc-stock">${p.stock <= 0 ? '<span class="badge badge-danger">AGOTADO</span>' : `Stock: ${p.stock}`} ${Components.stockStatusBadge(p)}</div>
        </div>
      `).join('') || Components.empty('📦', 'Sin resultados');
    }
  },
  caja() {
    const u=Auth.currentUser();
    const jornada=Store.getOpenJourney(u?.id);
    const caja=Store.getOpenCash(u?.id);
    const stats=jornada?this._journeyStats(jornada):null;
    const montoInicial=Number(jornada?.montoInicial??caja?.montoInicial??0);
    const hoy=Store.today();
    const cruzoMedianoche=!!jornada&&(jornada.fechaApertura||jornada.fecha)!==hoy;
    const stale=!!jornada&&stats.duration>=14*60;
    const history=[...Store.state.jornadas]
      .filter(j=>Auth.isAdmin()||j.usuarioId===u.id)
      .sort((a,b)=>(`${b.fechaApertura||b.fecha||''}${b.horaApertura||b.hora||''}`).localeCompare(`${a.fechaApertura||a.fecha||''}${a.horaApertura||a.hora||''}`))
      .slice(0,20);

    const historyRows=history.map(j=>{
      const st=this._journeyStats(j);
      const open=j.estado==='Abierta';
      const status=open?'<span class="badge badge-success">● Abierta</span>':'<span class="badge badge-neutral">Cerrada</span>';
      const cierre=open?'—':`${Utils.formatDate(j.fechaCierre)} ${Utils.formatTime(j.horaCierre||'')}`;
      const diff=open?'<span class="badge badge-warning">Pendiente</span>':Math.abs(Number(j.diferencia||0))<0.005?'<span class="badge badge-success">S/ 0.00</span>':`<span class="badge ${Number(j.diferencia||0)<0?'badge-danger':'badge-warning'}">${Number(j.diferencia||0)>0?'+':''}${Utils.formatMoney(j.diferencia||0)}</span>`;
      return `<tr class="${open?'ux-cash-row-open':''}">
        <td data-label="Jornada"><strong>${Utils.escapeHtml(j.numero||Store.journeyNumber(j.id))}</strong></td>
        <td data-label="Apertura">${Utils.formatDate(j.fechaApertura||j.fecha)} ${Utils.formatTime(j.horaApertura||j.hora)}</td>
        <td data-label="Responsable">${Utils.escapeHtml(j.usuarioNombre||Store.getUser(j.usuarioId)?.nombres||'—')}</td>
        <td data-label="Ventas"><strong class="ux-money-cell">${Utils.formatMoney(st.totalSales)}</strong></td>
        <td data-label="Gastos">${Utils.formatMoney(st.totalExpenses)}</td>
        <td data-label="Duración">${this._durationLabel(st.duration)}</td>
        <td data-label="Estado">${status}<small class="ux-cash-closed-at">${cierre}</small></td>
        <td data-label="Diferencia">${diff}</td>
        <td data-label="Acciones"><button class="btn btn-sm btn-secondary" onclick="Pages.viewJornada('${j.id}')">👁️ Ver</button></td>
      </tr>`;
    }).join('')||'<tr><td colspan="9">Todavía no hay jornadas registradas</td></tr>';

    return `<div class="page-header ux-page-head">
      <div><h1 class="page-title">🌙 Jornada y Caja</h1><p class="ux-page-sub">Una jornada puede empezar hoy y terminar mañana. No se cierra automáticamente a medianoche.</p></div>
      <button class="btn btn-secondary" onclick="Router.go('jornadas')">📚 Ver todas las jornadas</button>
    </div>
    ${cruzoMedianoche?`<div class="alert ux-cash-overnight"><strong>🌙 La jornada continúa desde ${Utils.formatDate(jornada.fechaApertura||jornada.fecha)} ${Utils.formatTime(jornada.horaApertura||jornada.hora)}</strong><br>El cambio de fecha no afecta la caja. Todas las ventas siguen dentro de <strong>${Utils.escapeHtml(jornada.numero||Store.journeyNumber(jornada.id))}</strong> hasta que la finalices.</div>`:''}
    ${stale?`<div class="alert ux-journey-warning"><strong>⚠️ Esta jornada lleva ${this._durationLabel(stats.duration)} abierta.</strong><br>No se cerrará sola. Si el bar todavía está atendiendo puedes continuar; si ya terminó la atención, revisa la caja y finalízala.</div>`:''}
    <div class="ux-cash-how"><span>1️⃣ Abre la jornada al iniciar</span><span>2️⃣ Vende durante toda la noche, aunque pase medianoche</span><span>3️⃣ Finaliza la jornada cuando termine realmente la atención</span></div>

    <div class="ux-cash-hero ${jornada?'is-open':'is-closed'}">
      <div class="ux-cash-state"><span class="ux-status-dot"></span><div>
        <small>ESTADO OPERATIVO</small>
        <h2>${jornada?'JORNADA ABIERTA':'SIN JORNADA ABIERTA'}</h2>
        <p>${jornada?`${Utils.escapeHtml(jornada.numero||Store.journeyNumber(jornada.id))} · desde ${Utils.formatDate(jornada.fechaApertura||jornada.fecha)} ${Utils.formatTime(jornada.horaApertura||jornada.hora)} · ${this._durationLabel(stats.duration)}`:'Abre una jornada cuando el bar empiece a atender.'}</p>
      </div></div>
    </div>

    ${jornada?`
      <div class="stat-cards ux-payment-summary">
        <div class="stat-card"><div class="stat-label">💰 Ventas de la jornada</div><div class="stat-value amber">${Utils.formatMoney(stats.totalSales)}</div><div class="stat-sub">${stats.sales.length} venta(s) válida(s)</div></div>
        <div class="stat-card"><div class="stat-label">💵 Efectivo de ventas</div><div class="stat-value">${Utils.formatMoney(stats.pay.Efectivo)}</div><div class="stat-sub">No incluye monto inicial</div></div>
        <div class="stat-card"><div class="stat-label">📱 Yape / Plin</div><div class="stat-value">${Utils.formatMoney(stats.pay.Yape+stats.pay.Plin)}</div><div class="stat-sub">Yape ${Utils.formatMoney(stats.pay.Yape)} · Plin ${Utils.formatMoney(stats.pay.Plin)}</div></div>
        <div class="stat-card"><div class="stat-label">💳 Tarjeta</div><div class="stat-value">${Utils.formatMoney(stats.pay.Tarjeta)}</div><div class="stat-sub">Pagos con tarjeta</div></div>
        <div class="stat-card"><div class="stat-label">💸 Gastos de la jornada</div><div class="stat-value">${Utils.formatMoney(stats.totalExpenses)}</div><div class="stat-sub">En efectivo: ${Utils.formatMoney(stats.gastosEfectivo)}</div></div>
      </div>
      <div class="ux-cash-layout">
        <div class="card ux-cash-action">
          <div class="ux-section-head"><div><h3>💵 Control de efectivo</h3><p>El monto inicial se mantiene separado de las ventas.</p></div></div>
          <div class="ux-money-row"><span>🏁 Monto inicial</span><strong>${Utils.formatMoney(montoInicial)}</strong></div>
          <div class="ux-money-row"><span>➕ Ventas en efectivo</span><strong>${Utils.formatMoney(stats.pay.Efectivo)}</strong></div>
          <div class="ux-money-row"><span>➕ Ingresos adicionales</span><strong>${Utils.formatMoney(stats.ingresos)}</strong></div>
          <div class="ux-money-row"><span>➖ Retiros de caja</span><strong>${Utils.formatMoney(stats.retiros)}</strong></div>
          <div class="ux-money-row"><span>➖ Gastos pagados en efectivo</span><strong>${Utils.formatMoney(stats.gastosEfectivo)}</strong></div>
          <div class="ux-money-row ux-money-total"><span>EFECTIVO ESPERADO</span><strong>${Utils.formatMoney(stats.expected)}</strong></div>
          <div class="ux-cash-move-actions">
            <button class="btn btn-secondary" onclick="Pages.openCashMovementForm('Ingreso')">➕ Ingreso de efectivo</button>
            <button class="btn btn-secondary" onclick="Pages.openCashMovementForm('Retiro')">➖ Retiro de efectivo</button>
          </div>
          <hr style="border-color:var(--border);margin:1.25rem 0">
          <h3>🔒 Finalizar jornada</h3>
          <p class="ux-help ux-help-prominent">Hazlo solo cuando termine realmente la atención del bar. No necesitas cerrar a medianoche.</p>
          <label class="form-label">Efectivo real contado al cierre</label>
          <input id="cash-real" class="form-control" type="number" min="0" step="0.01" value="${Math.max(0,stats.expected).toFixed(2)}">
          <p class="ux-help">El sistema comparará lo contado contra el monto inicial + ventas en efectivo + ingresos − retiros − gastos pagados en efectivo.</p>
          <button id="btn-close-cash" class="btn btn-danger btn-full" onclick="Pages.closeCash()">Finalizar jornada y cerrar caja</button>
        </div>
        <div class="card ux-cash-action">
          <div class="ux-section-head"><div><h3>🧾 Actividad de caja</h3><p>Ingresos y retiros de efectivo de esta jornada.</p></div></div>
          ${stats.cashMovements.length?`<div class="ux-cash-movement-list">${[...stats.cashMovements].sort((a,b)=>(`${b.fecha}${b.hora}`).localeCompare(`${a.fecha}${a.hora}`)).map(m=>`<div class="ux-cash-movement"><span>${m.tipo==='Ingreso'?'➕':'➖'} ${Utils.escapeHtml(m.concepto)}</span><strong class="${m.tipo==='Ingreso'?'positive':'negative'}">${m.tipo==='Ingreso'?'+':'-'}${Utils.formatMoney(m.monto)}</strong><small>${Utils.formatDate(m.fecha)} ${Utils.formatTime(m.hora)}</small></div>`).join('')}</div>`:Components.empty('💵','Todavía no hay ingresos ni retiros adicionales')}
        </div>
      </div>
    `:`
      <div class="card ux-cash-action ux-open-journey-card">
        <h3>▶️ Abrir nueva jornada</h3>
        <p class="ux-help ux-help-prominent">La jornada agrupará ventas, gastos, movimientos de inventario y caja desde la apertura hasta el cierre, aunque cruce medianoche.</p>
        <label class="form-label">Monto inicial en efectivo</label>
        <input id="cash-initial" class="form-control" type="number" min="0" step="0.01" value="0">
        <p class="ux-help">Este dinero es solo el fondo de apertura y <strong>no suma como venta</strong>.</p>
        <button id="btn-open-cash" class="btn btn-primary btn-full" onclick="Pages.openCash()">Abrir jornada y comenzar</button>
      </div>
    `}

    <div class="card ux-cash-history-card">
      <div class="ux-section-head ux-cash-history-head"><div><h3>📚 Jornadas recientes</h3><p>Cada fila representa un turno completo del bar.</p></div><span class="ux-history-count">${history.length} registro${history.length===1?'':'s'}</span></div>
      <div class="table-wrap ux-cash-history"><table><thead><tr><th>Jornada</th><th>Apertura</th><th>Responsable</th><th>Ventas</th><th>Gastos</th><th>Duración</th><th>Estado / cierre</th><th>Diferencia</th><th></th></tr></thead><tbody id="cash-tbody">${historyRows}</tbody></table></div>
    </div>`;
  },

  openCash(){
    const v=Number(document.getElementById('cash-initial')?.value);
    if(!Number.isFinite(v)||v<0)return Toast.show('Ingresa un monto inicial válido','error');
    confirmAction(`Abrir una nueva jornada con ${Utils.formatMoney(v)} de efectivo inicial. Permanecerá abierta hasta que la finalices manualmente. ¿Confirmar?`,async()=>{
      const r=await Store.openCash(v);
      Toast.show(r.ok?`${r.numero||'Jornada'} abierta. Puedes vender aunque pase medianoche.`:r.error,r.ok?'success':'error');
      if(r.ok){SetupGuide.mark('cashOpened');Modal.close();Router.go('caja')}
      return r;
    },{title:'Abrir jornada',confirmText:'Abrir jornada',danger:false,key:'open-cash'});
  },

  closeCash(){
    const v=Number(document.getElementById('cash-real')?.value);
    if(!Number.isFinite(v)||v<0)return Toast.show('Ingresa un efectivo real válido','error');
    confirmAction(`Finalizar la jornada declarando ${Utils.formatMoney(v)} de efectivo contado. Se incluirá toda la actividad desde la apertura, incluso si pasó al día siguiente.`,async()=>{
      const r=await Store.closeCash(v);
      Toast.show(r.ok?`Jornada finalizada. Diferencia de efectivo: ${Utils.formatMoney(r.diferencia)}`:r.error,r.ok?'success':'error');
      if(r.ok){Modal.close();Router.go('jornadas')}
      return r;
    },{title:'Finalizar jornada y cerrar caja',confirmText:'Finalizar jornada',danger:true,key:'close-cash'});
  },

  openCashMovementForm(tipo='Ingreso'){
    if(!Store.getOpenJourney())return Toast.show('Primero abre una jornada','error');
    if(!['Ingreso','Retiro'].includes(tipo))return;
    Modal.open(`
      <div class="modal-header"><h2>${tipo==='Ingreso'?'➕ Ingreso de efectivo':'➖ Retiro de efectivo'}</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <p class="ux-help">${tipo==='Ingreso'?'Úsalo para sencillo u otro dinero que entra a la caja sin ser una venta.':'Úsalo cuando retires dinero físico de la caja durante la jornada.'}</p>
        <div class="form-group"><label>Motivo *</label><input id="cash-move-concept" type="text" maxlength="160" placeholder="${tipo==='Ingreso'?'Ej. Sencillo adicional':'Ej. Retiro para resguardo'}"></div>
        <div class="form-group"><label>Monto (S/) *</label><input id="cash-move-amount" type="number" min="0.01" step="0.01" placeholder="0.00"></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn ${tipo==='Ingreso'?'btn-primary':'btn-danger'}" onclick="Pages.saveCashMovement('${tipo}')">Registrar ${tipo.toLowerCase()}</button></div>
    `);
  },

  async saveCashMovement(tipo){
    const concepto=(document.getElementById('cash-move-concept')?.value||'').trim();
    const monto=Number(document.getElementById('cash-move-amount')?.value);
    if(!concepto||!Number.isFinite(monto)||monto<=0)return Toast.show('Completa motivo y monto válido','error');
    return confirmAction(`${tipo==='Ingreso'?'Ingresar':'Retirar'} ${Utils.formatMoney(monto)}. Motivo: ${concepto}. ¿Confirmar?`,async()=>{
      const r=await Store.addCashMovement({tipo,monto,concepto});
      Toast.show(r.ok?`${tipo} registrado`:r.error,r.ok?'success':'error');
      if(r.ok){Modal.close();Router.go('caja')}
      return r;
    },{title:`Confirmar ${tipo.toLowerCase()}`,confirmText:'Confirmar',danger:tipo==='Retiro',key:'cash-move'});
  },

  jornadas() {
    const u=Auth.currentUser();
    const list=[...Store.state.jornadas]
      .filter(j=>Auth.isAdmin()||j.usuarioId===u.id)
      .sort((a,b)=>(`${b.fechaApertura||b.fecha||''}${b.horaApertura||b.hora||''}`).localeCompare(`${a.fechaApertura||a.fecha||''}${a.horaApertura||a.hora||''}`));
    const open=list.filter(j=>j.estado==='Abierta');
    const closed=list.filter(j=>j.estado==='Cerrada');
    const totalClosed=closed.reduce((a,j)=>a+Number(j.totalVentas||0),0);
    return `<div class="page-header"><div><h1 class="page-title">🌙 ${Auth.isAdmin()?'Jornadas':'Mis jornadas'}</h1><p class="ux-page-sub">Consulta cada turno completo, aunque haya empezado un día y terminado al siguiente.</p></div><button class="btn btn-primary" onclick="Router.go('caja')">${open.some(j=>j.usuarioId===u.id)?'Ver jornada actual':'Abrir jornada'}</button></div>
      <div class="stat-cards" style="margin-bottom:1.25rem">
        <div class="stat-card"><div class="stat-label">🟢 Jornadas abiertas</div><div class="stat-value">${open.length}</div><div class="stat-sub">activas actualmente</div></div>
        <div class="stat-card"><div class="stat-label">✅ Jornadas cerradas</div><div class="stat-value">${closed.length}</div><div class="stat-sub">en el historial cargado</div></div>
        <div class="stat-card"><div class="stat-label">💰 Ventas de jornadas cerradas</div><div class="stat-value amber">${Utils.formatMoney(totalClosed)}</div><div class="stat-sub">según los resúmenes guardados</div></div>
      </div>
      <div class="toolbar ux-filter-grid">
        <input type="search" id="journey-search" class="search-input" placeholder="🔎 Buscar jornada o responsable..." oninput="Pages.filterJornadas()">
        <select id="journey-status" class="filter-select" onchange="Pages.filterJornadas()"><option value="">Todos los estados</option><option value="Abierta">Abiertas</option><option value="Cerrada">Cerradas</option></select>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Jornada</th><th>Apertura</th><th>Cierre</th><th>Responsable</th><th>Duración</th><th>Ventas</th><th>Gastos</th><th>Estado</th><th></th></tr></thead><tbody id="journey-tbody">${this._journeyRows(list)}</tbody></table></div>`;
  },

  _journeyRows(list){
    if(!list.length)return `<tr><td colspan="9">${Components.empty('🌙','No hay jornadas para mostrar')}</td></tr>`;
    return list.map(j=>{
      const st=this._journeyStats(j);
      return `<tr>
        <td data-label="Jornada"><strong>${Utils.escapeHtml(j.numero||Store.journeyNumber(j.id))}</strong></td>
        <td data-label="Apertura">${Utils.formatDate(j.fechaApertura||j.fecha)} ${Utils.formatTime(j.horaApertura||j.hora)}</td>
        <td data-label="Cierre">${j.estado==='Cerrada'?`${Utils.formatDate(j.fechaCierre)} ${Utils.formatTime(j.horaCierre||'')}`:'—'}</td>
        <td data-label="Responsable">${Utils.escapeHtml(j.usuarioNombre||Store.getUser(j.usuarioId)?.nombres||'—')}</td>
        <td data-label="Duración">${this._durationLabel(st.duration)}</td>
        <td data-label="Ventas"><strong class="ux-money-cell">${Utils.formatMoney(st.totalSales)}</strong></td>
        <td data-label="Gastos">${Utils.formatMoney(st.totalExpenses)}</td>
        <td data-label="Estado">${j.estado==='Abierta'?'<span class="badge badge-success">● Abierta</span>':'<span class="badge badge-neutral">Cerrada</span>'}</td>
        <td data-label="Acciones"><button class="btn btn-sm btn-secondary" onclick="Pages.viewJornada('${j.id}')">👁️ Ver detalle</button></td>
      </tr>`;
    }).join('');
  },

  filterJornadas(){
    const q=(document.getElementById('journey-search')?.value||'').trim().toLowerCase();
    const status=document.getElementById('journey-status')?.value||'';
    const u=Auth.currentUser();
    const list=[...Store.state.jornadas].filter(j=>{
      if(!Auth.isAdmin()&&j.usuarioId!==u.id)return false;
      const text=`${j.numero||Store.journeyNumber(j.id)} ${j.usuarioNombre||''} ${j.fechaApertura||j.fecha||''}`.toLowerCase();
      return (!status||j.estado===status)&&(!q||text.includes(q));
    }).sort((a,b)=>(`${b.fechaApertura||b.fecha||''}${b.horaApertura||b.hora||''}`).localeCompare(`${a.fechaApertura||a.fecha||''}${a.horaApertura||a.hora||''}`));
    const tbody=document.getElementById('journey-tbody');
    if(tbody){tbody.innerHTML=this._journeyRows(list);try{App.makeTablesMobileFriendly(tbody.closest('.table-wrap')||document)}catch(_){}this._paginateRows('jornadas','journey-tbody',1);}
  },

  async viewJornada(id){
    const j=Store.state.jornadas.find(x=>x.id===id);if(!j)return Toast.show('Jornada no encontrada','error');
    if(Store.loadJourneyDetail){
      const r=await Store.loadJourneyDetail(id);
      if(r&&!r.ok)console.warn('Detalle de jornada incompleto:',r.error);
    }
    const st=this._journeyStats(j);
    const diff=j.estado==='Cerrada'?Number(j.diferencia||0):null;
    const names=(Array.isArray(j.empleadoNombres)&&j.empleadoNombres.length?j.empleadoNombres:[j.usuarioNombre]).filter(Boolean);
    Modal.open(`
      <div class="modal-header"><h2>🌙 ${Utils.escapeHtml(j.numero||Store.journeyNumber(j.id))}</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="detail-row"><span class="dr-label">Estado</span><span class="dr-value">${j.estado==='Abierta'?'🟢 ABIERTA':'✅ CERRADA'}</span></div>
        <div class="detail-row"><span class="dr-label">Apertura</span><span class="dr-value">${Utils.formatDate(j.fechaApertura||j.fecha)} ${Utils.formatTime(j.horaApertura||j.hora)}</span></div>
        <div class="detail-row"><span class="dr-label">Cierre</span><span class="dr-value">${j.estado==='Cerrada'?`${Utils.formatDate(j.fechaCierre)} ${Utils.formatTime(j.horaCierre||'')}`:'Todavía abierta'}</span></div>
        <div class="detail-row"><span class="dr-label">Duración</span><span class="dr-value">${this._durationLabel(st.duration)}</span></div>
        <div class="detail-row"><span class="dr-label">Responsable / empleados</span><span class="dr-value">${Utils.escapeHtml(names.join(', ')||'—')}</span></div>
        <hr style="border-color:var(--border)">
        <div class="detail-row"><span class="dr-label">Ventas</span><span class="dr-value">${Utils.formatMoney(st.totalSales)}</span></div>
        <div class="detail-row"><span class="dr-label">Efectivo</span><span class="dr-value">${Utils.formatMoney(st.pay.Efectivo)}</span></div>
        <div class="detail-row"><span class="dr-label">Yape / Plin</span><span class="dr-value">${Utils.formatMoney(st.pay.Yape+st.pay.Plin)}</span></div>
        <div class="detail-row"><span class="dr-label">Tarjeta</span><span class="dr-value">${Utils.formatMoney(st.pay.Tarjeta)}</span></div>
        <div class="detail-row"><span class="dr-label">Gastos</span><span class="dr-value">${Utils.formatMoney(st.totalExpenses)}</span></div>
        <hr style="border-color:var(--border)">
        <div class="detail-row"><span class="dr-label">Monto inicial</span><span class="dr-value">${Utils.formatMoney(j.montoInicial||0)}</span></div>
        <div class="detail-row"><span class="dr-label">Ingresos de efectivo</span><span class="dr-value">${Utils.formatMoney(st.ingresos)}</span></div>
        <div class="detail-row"><span class="dr-label">Retiros de efectivo</span><span class="dr-value">${Utils.formatMoney(st.retiros)}</span></div>
        <div class="detail-row"><span class="dr-label">Gastos en efectivo</span><span class="dr-value">${Utils.formatMoney(st.gastosEfectivo)}</span></div>
        <div class="detail-row"><span class="dr-label">Efectivo esperado</span><span class="dr-value"><strong>${Utils.formatMoney(st.expected)}</strong></span></div>
        ${j.estado==='Cerrada'?`<div class="detail-row"><span class="dr-label">Efectivo contado</span><span class="dr-value">${Utils.formatMoney(j.efectivoReal||0)}</span></div><div class="detail-row"><span class="dr-label">Diferencia</span><span class="dr-value"><strong>${diff>0?'+':''}${Utils.formatMoney(diff)}</strong></span></div>`:''}
      </div>
      <div class="modal-footer">${j.estado==='Abierta'&&j.usuarioId===Auth.currentUser()?.id?'<button class="btn btn-primary" onclick="Modal.close();Router.go(\'caja\')">Ir a la jornada actual</button>':''}<button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button></div>
    `);
  },

  _reportRange: null,
  _reportBusy: false,
  _reportExportReady: false,
  _reportDefaultRange() { return { desde: Store.daysAgo(30), hasta: Store.today() }; },
  _reportTotals(desde, hasta) {
    const sales = Store.state.sales.filter(s => s.estado !== 'Anulada' && s.fecha >= desde && s.fecha <= hasta);
    const expenses = Store.state.expenses.filter(e => e.fecha >= desde && e.fecha <= hasta && e.estado !== 'Anulado');
    return { ventas: sales.reduce((n,s) => n + Number(s.total||0), 0),
      gastos: expenses.reduce((n,e) => n + Number(e.monto||0), 0),
      pagos: Store.paymentTotals(sales) };
  },
  _reportCard(icon, label, amount, tone) {
    return `<article class="report-metric report-metric--${tone}" aria-label="${label}">
      <div class="report-metric-head"><span class="report-metric-icon" aria-hidden="true">${icon}</span><span class="report-metric-label">${label}</span></div>
      <div class="report-metric-value">${Utils.formatMoney(amount)}</div>
    </article>`;
  },
  _reportCards(desde, hasta) {
    const {ventas,gastos,pagos}=this._reportTotals(desde,hasta);
    return this._reportCard('💰','Ventas',ventas,'green') +
      this._reportCard('💸','Gastos',gastos,'rose') +
      this._reportCard('💵','Efectivo',pagos.Efectivo,'teal') +
      this._reportCard('📱','Yape',pagos.Yape,'purple') +
      this._reportCard('🔵','Plin',pagos.Plin,'blue') +
      this._reportCard('💳','Tarjeta',pagos.Tarjeta,'gold');
  },
  reportes(){
    if(!Auth.requireAdmin())return '';
    const range=this._reportRange || this._reportDefaultRange();
    const {desde,hasta}=range;
    const safeDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)?x:Store.today();
    return `<div class="report-page">
      <div class="page-header"><div><h1 class="page-title">📈 Reportes</h1><p class="ux-page-sub">Consulta los totales del negocio por fecha y método de pago.</p></div></div>
      <section class="report-filter" aria-label="Filtro de fechas">
        <div class="report-filter-title"><span>📅</span><div><strong>Rango de fechas</strong><small>Los totales se actualizan según el periodo seleccionado.</small></div></div>
        <div class="report-filter-fields"><label>Desde<input id="report-from" class="form-control" type="date" onchange="Pages._reportExportReady=false;document.getElementById('report-export').disabled=true" value="${safeDate(desde)}"></label>
        <label>Hasta<input id="report-to" class="form-control" type="date" onchange="Pages._reportExportReady=false;document.getElementById('report-export').disabled=true" value="${safeDate(hasta)}"></label>
        <button id="report-apply" class="btn btn-primary" type="button" onclick="Pages.applyReportRange()">Aplicar filtro</button>
        <button class="btn btn-secondary" type="button" onclick="Pages.resetReportRange()">Últimos 31 días</button>
        </div>
        <div class="report-export-actions">
          <button id="report-export" class="btn btn-success report-export-main" type="button" onclick="Pages.exportReportExcel()" disabled>📥 Descargar Excel (5 hojas)</button>
          <span class="report-export-help">Aplica el rango de fechas para habilitar la descarga. Se exportan Resumen, Ventas, Gastos, Métodos de pago y Productos vendidos.</span>
        </div>
        <div id="report-filter-status" class="report-filter-status" role="status" aria-live="polite">Mostrando ${safeDate(desde)} al ${safeDate(hasta)}</div>
      </section>
      <div id="report-cards" class="report-metrics" aria-live="polite">${this._reportCards(desde,hasta)}</div>
      <p class="report-footnote">Los métodos de pago representan ventas cobradas (incluidos pagos divididos). Efectivo no incluye ingresos ni retiros de caja. Las ventas anuladas no se suman.</p>
    </div>`;
  },
  async applyReportRange(){
    if(this._reportBusy)return;
    const desde=document.getElementById('report-from')?.value;
    const hasta=document.getElementById('report-to')?.value;
    const status=document.getElementById('report-filter-status');
    this._reportExportReady=false;const exportBtn=document.getElementById('report-export');if(exportBtn)exportBtn.disabled=true;
    const valid=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00Z'));
    if(!valid(desde)||!valid(hasta)||desde>hasta){Toast.show('Selecciona un rango de fechas válido','error');return;}
    // Evitar consultas de años completos por accidente en el plan gratuito.
    const days=(Date.parse(hasta+'T12:00:00Z')-Date.parse(desde+'T12:00:00Z'))/86400000;
    if(days>365){Toast.show('Selecciona como máximo 366 días por consulta','error');return;}
    this._reportBusy=true;
    const btn=document.getElementById('report-apply');if(btn){btn.disabled=true;btn.textContent='Cargando…';}
    if(status)status.textContent='Consultando información del periodo…';
    try{
      const results=await Promise.all([Store.loadSalesForRange(desde,hasta),Store.loadExpensesForRange(desde,hasta)]);
      const fail=results.find(x=>!x?.ok);
      if(fail){if(status)status.textContent='No se pudieron cargar todos los datos. Se mantienen los totales anteriores.';Toast.show(fail.error||'Error consultando reportes','error');return;}
      this._reportRange={desde,hasta};
      this._reportExportReady=true; if(exportBtn)exportBtn.disabled=false;
      const cards=document.getElementById('report-cards');if(cards)cards.innerHTML=this._reportCards(desde,hasta);
      if(status)status.textContent=`Mostrando ${desde} al ${hasta}`;
    }catch(e){if(status)status.textContent='Error al actualizar el reporte';Toast.show(e.message||'Error al cargar reporte','error');}
    finally{this._reportBusy=false;if(btn){btn.disabled=false;btn.textContent='Aplicar filtro';}}
  },
  async exportReportExcel(){
    if(!Auth.requireAdmin())return;
    if(this._reportBusy||!this._reportExportReady){Toast.show('Primero aplica el filtro y espera a que termine de cargar','error');return;}
    if(typeof XLSX==='undefined'){Toast.show('No se cargó el generador Excel. Comprueba tu conexión','error');return;}
    const {desde,hasta}=this._reportRange||{};
    if(!desde||!hasta){Toast.show('Selecciona y aplica un periodo','error');return;}
    const sales=Store.state.sales.filter(s=>s.estado!=='Anulada'&&s.fecha>=desde&&s.fecha<=hasta);
    const expenses=Store.state.expenses.filter(e=>e.estado!=='Anulado'&&e.fecha>=desde&&e.fecha<=hasta);
    const totals=this._reportTotals(desde,hasta);
    const safe=v=>{const x=String(v??'');return /^[=+@\-\t\r\n]/.test(x)?"'"+x:x;};
    const money=v=>Math.round((Number(v)||0)*100)/100;
    const date=v=>safe(v||'');
    const payments=[];
    const products=[];
    const prodAgg=new Map();
    for(const s of sales){
      for(const pay of Store.getSalePayments(s))payments.push([date(s.fecha),safe(s.numero||s.id),safe(s.empleadoNombre||''),safe(pay.metodo),money(pay.monto)]);
      for(const it of (Array.isArray(s.items)?s.items:[])){
        const id=String(it.productoId||it.id||'');
        const product=Store.getProduct(id);
        const name=safe(it.nombre||product?.nombre||'Producto sin nombre');
        const category=safe(it.categoria||Store.getCategory(product?.categoriaId)?.nombre||product?.categoria||'');
        const qty=Number(it.cantidad)||0;
        const price=money(it.precioUnitario);
        const amount=money(it.subtotal??qty*price);
        products.push([date(s.fecha),safe(s.numero||s.id),name,category,qty,price,amount]);
        const key=id||name;
        const agg=prodAgg.get(key)||{name,category,qty:0,amount:0};agg.qty+=qty;agg.amount+=amount;prodAgg.set(key,agg);
      }
    }
    const wb=XLSX.utils.book_new();
    const palette={dark:'163129',green:'167B55',light:'E9F5EE',white:'FFFFFF',grey:'64748B',ink:'17352B'};
    const header=(n)=>({font:{bold:true,color:{rgb:palette.white},sz:11},fill:{fgColor:{rgb:palette.green}},alignment:{vertical:'center',wrapText:true},border:{bottom:{style:'thin',color:{rgb:'DDE9E2'}}}});
    const makeSheet=(name,rows,widths,moneyCols=[],numCols=[],opt={})=>{
      const ws=XLSX.utils.aoa_to_sheet(rows);
      ws['!cols']=widths.map(w=>({wch:w}));
      const head=opt.headerRow??0;
      ws['!rows']=Array.from({length:Math.max(rows.length,head+1)},(_,i)=>({hpt:i===head?29:(i===0&&opt.summary?36:23)}));
      ws['!autofilter']=opt.summary?undefined:{ref:XLSX.utils.encode_range({s:{r:head,c:0},e:{r:Math.max(head,rows.length-1),c:widths.length-1}})};
      ws['!freeze']={xSplit:0,ySplit:head+1};
      for(let c=0;c<widths.length;c++){
        const ref=XLSX.utils.encode_cell({r:head,c});
        if(ws[ref])ws[ref].s=header(c);
      }
      for(let r=head+1;r<rows.length;r++)for(let c=0;c<widths.length;c++){
        const ref=XLSX.utils.encode_cell({r,c});if(!ws[ref])continue;
        if(moneyCols.includes(c)&&ws[ref].t==='n')ws[ref].z='"S/ "#,##0.00;[Red]("S/ "#,##0.00)';
        if(numCols.includes(c)&&ws[ref].t==='n')ws[ref].z='#,##0.##';
        ws[ref].s={font:{name:'Aptos',sz:10,color:{rgb:palette.ink}},fill:{fgColor:{rgb:r%2===0?'F2F8F4':'FFFFFF'}},alignment:{vertical:'center'}};
      }
      XLSX.utils.book_append_sheet(wb,ws,name);
      return ws;
    };
    const summary=[
      ['PROYECTOBARX | REPORTE GENERAL'],
      ['Periodo',desde,'al',hasta],
      ['Generado',new Date().toLocaleString('es-PE')],
      [],
      ['INDICADOR','TOTAL'],
      ['Ventas',money(totals.ventas)],['Gastos',money(totals.gastos)],
      ['Saldo operativo (ventas - gastos)',money(totals.ventas-totals.gastos)],
      ['Efectivo',money(totals.pagos.Efectivo)],['Yape',money(totals.pagos.Yape)],
      ['Plin',money(totals.pagos.Plin)],['Tarjeta',money(totals.pagos.Tarjeta)],
      ['N° de ventas',sales.length],['N° de gastos',expenses.length],
      [],['CONTROL DE COBROS','TOTAL'],
      ['Suma de medios de pago',money(totals.pagos.Efectivo+totals.pagos.Yape+totals.pagos.Plin+totals.pagos.Tarjeta)],
      ['Diferencia con ventas',money(totals.ventas-(totals.pagos.Efectivo+totals.pagos.Yape+totals.pagos.Plin+totals.pagos.Tarjeta))],
      [],['OBSERVACIONES'],
      ['Solo se exportan ventas y gastos no anulados del periodo seleccionado.'],
      ['Efectivo refleja cobros por ventas, no ingresos/retiros de caja.'],
      ['Saldo operativo no equivale a utilidad neta.'],
      ['Las ventas con pagos divididos aparecen por método en la hoja Métodos de pago.']
    ];
    const sws=makeSheet('Resumen',summary,[46,24,16,23],[1],[],{summary:true,headerRow:4});
    sws['!merges']=[{s:{r:0,c:0},e:{r:0,c:3}},{s:{r:19,c:0},e:{r:19,c:3}}];
    if(sws.A1)sws.A1.s={font:{bold:true,sz:20,color:{rgb:palette.white}},fill:{fgColor:{rgb:palette.dark}},alignment:{vertical:'center'}};
    for(const r of [15,19]){const ref='A'+(r+1);if(sws[ref])sws[ref].s={font:{bold:true,color:{rgb:palette.white}},fill:{fgColor:{rgb:palette.dark}}};}
    for(let r=5;r<=17;r++){const cell=sws['B'+(r+1)];if(cell&&cell.t==='n'&&r!==12&&r!==13)cell.z='"S/ "#,##0.00';}
    const saleRows=[['Fecha','Hora','N° venta','Empleado','Jornada','Estado','Método de pago','Total (S/)'],...sales.map(s=>[date(s.fecha),safe(s.hora),safe(s.numero||s.id),safe(s.empleadoNombre),safe(s.jornadaId||s.cajaId),safe(s.estado),safe(Store.salePaymentLabel(s)),money(s.total)])];
    const expenseRows=[['Fecha','Hora','Concepto','Categoría','Origen','Método de pago','Jornada','Importe (S/)'],...expenses.map(e=>[date(e.fecha),safe(e.hora),safe(e.concepto),safe(e.categoria),safe(e.origen),safe(e.metodoPago),safe(e.jornadaId||e.cajaId),money(e.monto)])];
    makeSheet('Ventas',saleRows,[15,12,23,27,26,17,25,19],[7]);
    makeSheet('Gastos',expenseRows,[15,12,42,24,22,22,26,19],[7]);
    makeSheet('Métodos de pago',[['Fecha','N° venta','Empleado','Método','Importe (S/)'],...payments],[15,25,28,20,19],[4]);
    const byProduct=[...prodAgg.values()].sort((a,b)=>b.amount-a.amount);
    makeSheet('Productos vendidos',[['Producto','Categoría','Unidades vendidas','Ingresos (S/)'],...byProduct.map(a=>[a.name,a.category,a.qty,money(a.amount)])],[39,27,23,21],[3],[2]);
    try{XLSX.writeFile(wb,`ProyectoBarX_Reporte_${desde}_al_${hasta}.xlsx`,{compression:true});Toast.show('Reporte Excel descargado','success');}
    catch(e){Toast.show('No se pudo generar el Excel: '+(e.message||e),'error');}
  },
  async resetReportRange(){
    const d=this._reportDefaultRange();
    document.getElementById('report-from').value=d.desde;
    document.getElementById('report-to').value=d.hasta;
    await this.applyReportRange();
  },
  async anularVenta(id){const motivo=prompt('Motivo de anulación:')?.trim();if(!motivo)return;confirmAction('La venta será anulada y el stock será devuelto. Esta acción no debe repetirse. ¿Confirmar?',async()=>{const r=await Store.cancelSale(id,motivo);Toast.show(r.ok?'Venta anulada':r.error,r.ok?'success':'error');if(r.ok){Modal.close();Router.go('historial')}return r;},{title:'Anular venta',confirmText:'Anular venta',danger:true,key:'cancel-sale:'+id})}
,
  configuracion() {
    if (!Auth.requireAdmin()) return '';
    const u = Auth.currentUser() || {};
    const setup = SetupGuide.snapshot();
    const active = SetupGuide.isActive();
    const step = (num, icon, title, desc, done, enabled, page, optional=false) => `
      <div class="setup-step ${done ? 'done' : (enabled ? 'current' : 'locked')}">
        <div class="setup-step-num">${done ? '✓' : num}</div>
        <div class="setup-step-body"><div class="setup-step-title">${icon} ${title}${optional ? ' <span class="setup-optional">Opcional</span>' : ''}</div><div class="setup-step-desc">${desc}</div></div>
        <div class="setup-step-action">${done ? '<span class="badge badge-success">Listo</span>' : (enabled ? `<button class="btn btn-sm btn-secondary" onclick="Router.go('${page}')">Ir ahora</button>` : '<span class="setup-lock-pill">🔒 Bloqueado</span>')}</div>
      </div>`;

    const tutorialHtml = active ? `
      <div class="setup-progress-head"><div><strong>Configuración guiada activa</strong><p>Los apartados se habilitan a medida que completas lo necesario.</p></div><span class="badge badge-warning">MODO INICIO</span></div>
      <div class="setup-steps">
        ${step(1,'📂','Crear categorías','Crea por lo menos una categoría para ordenar tu carta.',setup.hasCategory,true,'categorias')}
        ${step(2,'🏷️','Configurar inventario','Registra bebidas, comidas y demás productos con sus precios.',setup.hasProduct,setup.hasCategory,'productos')}
        ${step(3,'📦','Cargar stock','Deja al menos un producto activo con stock mayor a cero.',setup.hasStock,setup.hasProduct,'movimientos')}
        ${step(4,'👥','Crear empleados','Puedes crear las cuentas de tus trabajadores ahora o hacerlo después.',setup.hasEmployee,setup.hasProduct,'empleados',true)}
        ${step(5,'🌙','Abrir la primera jornada','Abre una jornada y registra el monto inicial de caja para comprobar que el flujo de ventas está listo.',setup.cashOpened,setup.hasStock,'caja')}
        ${step(6,'🛒','Venta de prueba','Realiza una venta de prueba. Si no deseas generar una venta, puedes omitir este paso.',setup.saleDone || setup.saleSkipped,setup.cashOpened,'ventas')}
      </div>
      ${setup.cashOpened && !setup.saleDone && !setup.saleSkipped ? '<div class="setup-inline-actions"><button class="btn btn-secondary" onclick="Pages.skipSetupSale()">Omitir venta de prueba</button></div>' : ''}
      <div class="setup-finish">
        <div><strong>${setup.canFinish ? 'Todo listo para empezar' : 'Completa los pasos obligatorios'}</strong><p>${setup.canFinish ? 'Finaliza el tutorial para habilitar todos los apartados sin restricciones.' : 'Categoría, producto, stock, jornada y venta de prueba (o su omisión) son necesarios.'}</p></div>
        <button class="btn btn-primary" ${setup.canFinish ? '' : 'disabled'} onclick="Pages.finishSetup()">Finalizar configuración</button>
      </div>` : `
      <div class="setup-complete"><div class="setup-complete-icon">✅</div><div><strong>Asistente de inicio desactivado</strong><p>Todos los apartados están habilitados. Puedes volver a activar la guía cuando quieras.</p></div><button class="btn btn-secondary" onclick="Pages.restartSetup()">Mostrar tutorial</button></div>`;

    return `<div class="page-header"><div><h1 class="page-title">⚙️ Configuración</h1><p class="ux-page-sub">Puesta en marcha, estado general y herramientas administrativas.</p></div></div>
      <div class="card setup-card">
        <div class="ux-section-head"><div><h3>🧭 Tutorial para iniciar desde cero</h3><p>Guía paso a paso para preparar el bar sin saltarse configuraciones importantes.</p></div></div>
        ${tutorialHtml}
      </div>
      <div class="row g-3 mt-1">
        <div class="col-12 col-lg-6"><div class="card p-3 h-100">
          <h5>Proyecto X Bar</h5><p class="text-muted mb-3">Información general del sistema.</p>
          <div class="mb-2"><strong>Administrador:</strong> ${Utils.escapeHtml(u.nombre || u.nombres || 'Administrador')}</div>
          <div class="mb-2"><strong>Correo:</strong> ${Utils.escapeHtml(u.email || '')}</div>
          <div class="mb-2"><strong>Base de datos:</strong> Firebase / Firestore</div>
          <div><strong>Proyecto:</strong> ${Utils.escapeHtml(firebaseConfig.projectId || '')}</div>
        </div></div>
        <div class="col-12 col-lg-6"><div class="card p-3 h-100">
          <h5>⚡ Optimización Firebase</h5>
          <div class="ux-opt-list"><span>✓ Productos en tiempo real</span><span>✓ Ventas solo del día en tiempo real</span><span>✓ Historiales bajo demanda</span><span>✓ Consultas históricas limitadas</span><span>✓ Caché persistente en el dispositivo</span><span>✓ Cierre de caja reutiliza datos ya cargados</span></div>
          <p class="text-muted mt-3 mb-0">La app mantiene carga diferida, límites en historiales y persistencia local para trabajar de forma eficiente.</p>
        </div></div>
      </div>
      <div class="card p-3 mt-3" id="backup-manager">
        <h3>🗄️ Copias de seguridad · ZIP único</h3>
        <p class="text-muted">Descarga un solo ZIP de Firestore. Para restaurar documentos faltantes, comprueba la contraseña del administrador y procesa por lotes pequeños. El avance se guarda localmente; si se cierra el navegador, importa de nuevo el mismo ZIP para continuar.</p>
        <button class="btn btn-secondary" onclick="BackupManager.measure()">1. Calcular respaldo</button>
        <p class="ux-help mt-2" id="backup-estimate">Consulta el tamaño antes de descargar. Las lecturas consumen cuota de Firestore.</p>
        <button class="btn btn-primary mt-1" onclick="BackupManager.exportParts()">2. Descargar ZIP único</button>
        <hr><h5>🔐 Restaurar documentos faltantes</h5>
        <p class="text-muted">Solo recupera documentos que no existan. No reemplaza toda la base de datos ni restaura Authentication. Suspende las operaciones del bar antes de comenzar.</p>
        <div class="row g-2"><div class="col-12 col-md-6"><input id="backup-password" type="password" class="form-control" autocomplete="current-password" placeholder="Contraseña del administrador"></div>
        <div class="col-12 col-md-6"><button class="btn btn-secondary" onclick="BackupManager.access()">Verificar contraseña y acceder</button></div></div>
        <div id="backup-import-panel" hidden class="mt-3"><label class="form-label" for="backup-zip-input">Selecciona el ZIP de respaldo</label>
          <input class="form-control" id="backup-zip-input" type="file" accept=".zip,application/zip" onchange="BackupManager.addPart(this)">
          <div id="backup-restore-controls" hidden class="mt-2"><p id="backup-restore-summary"></p><button class="btn btn-danger" onclick="BackupManager.restoreMissing()">Recuperar documentos faltantes / continuar</button></div>
        </div>
        <div class="mt-3" id="backup-progress" aria-live="polite"></div><div id="backup-collection-progress" class="barx-restore-collections" aria-live="polite"></div><p class="text-warning">Durante la restauración se activa el modo mantenimiento. Si se interrumpe, permanecerá activo hasta completar la recuperación.</p>
        <p class="ux-help mt-2" id="backup-status" aria-live="polite">Sin operación en curso.</p>
        <p class="text-muted small">La cuota gratuita diaria es compartida con el bar. El navegador no conoce la cuota exacta restante. Si se pausa, se conserva el cursor localmente y se requiere volver a abrir el sistema e importar el ZIP. No borres el almacenamiento del navegador antes de terminar.</p>
      </div>
      <div class="card reset-card mt-3">
        <div class="reset-card-main"><div class="reset-icon">♻️</div><div><h3>Reinicio del sistema</h3><p>Borra ventas, cajas, gastos, movimientos, productos, categorías, archivos eliminados, auditoría y perfiles de empleados. <strong>Conserva al administrador conectado</strong> para que no pierdas el acceso.</p></div></div>
        <div class="reset-warning">⚠️ Esta acción es irreversible. Está pensada para dejar el proyecto limpio antes de entregarlo o comenzar una instalación nueva.</div>
        <button class="btn btn-danger" onclick="Pages.openResetSystemModal()">Reiniciar y dejar sistema limpio</button>
      </div>`;
  },

  skipSetupSale() {
    SetupGuide.skipSale();
    Toast.show('Venta de prueba omitida. Ya puedes finalizar la configuración.');
    Router.go('configuracion');
  },

  finishSetup() {
    const r = SetupGuide.finish();
    if (!r.ok) return Toast.show(r.error, 'error');
    Toast.show('Configuración inicial finalizada. Todos los apartados están habilitados.');
    App.buildNav();
    Router.go('configuracion');
  },

  restartSetup() {
    confirmAction('Se volverá a activar la guía y algunos apartados podrían aparecer bloqueados hasta completar sus requisitos. No se borrará ningún dato.', async()=>{
      SetupGuide.restart();
      Modal.close();
      App.buildNav();
      Router.go('configuracion');
      return {ok:true};
    }, {title:'Activar tutorial de inicio',confirmText:'Activar tutorial',danger:false,key:'restart-setup'});
  },

  openResetSystemModal() {
    Modal.open(`
      <div class="modal-header"><h2>♻️ Reiniciar sistema</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="alert alert-danger"><strong>Se eliminarán los datos operativos del sistema.</strong><br>El administrador conectado será conservado.</div>
        <label class="form-label">Contraseña actual del administrador</label>
        <input id="reset-system-password" class="form-control" type="password" autocomplete="off" placeholder="Ingresa la contraseña" onkeydown="if(event.key==='Enter') Pages.validateResetPassword()">
        <p class="ux-help mt-2">Se verificará directamente con Firebase Authentication antes de borrar los datos.</p>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-danger" onclick="Pages.validateResetPassword()">Continuar</button></div>
    `, {staticBackdrop:true});
    setTimeout(()=>document.getElementById('reset-system-password')?.focus(),50);
  },

  validateResetPassword() {
    const pass = document.getElementById('reset-system-password')?.value || '';
    if (!pass) return Toast.show('Ingresa tu contraseña actual', 'error');
    const adminPassword = pass;
    confirmAction('¿Confirmas que deseas borrar todos los datos del negocio y volver al modo de configuración inicial? Esta acción NO se puede deshacer.', async()=>{
      const res = await Store.resetSystem(adminPassword);
      if (!res.ok) { Toast.show(res.error, 'error'); return res; }
      SetupGuide.reset();
      App.buildNav();
      Modal.close();
      const employeeCount = Number(res.employeeProfilesDeleted || 0);
      Modal.open(`
        <div class="modal-header"><h2>✅ Sistema reiniciado</h2><button class="btn-icon" onclick="Modal.close();Router.go('configuracion')">✕</button></div>
        <div class="modal-body">
          <p>El sistema quedó limpio y el tutorial de puesta en marcha volvió a activarse.</p>
          <div class="alert alert-warning"><strong>Importante sobre Firebase Authentication:</strong><br>Se eliminaron ${employeeCount} perfil(es) de empleado de Firestore, pero una aplicación web no puede borrar de forma segura las cuentas de otros usuarios de Firebase Authentication. Si vas a reutilizar los mismos correos, elimínalos una vez desde <strong>Firebase Console → Authentication → Users</strong>.</div>
          <p class="text-muted">El administrador con el que realizaste el reinicio se conserva para que puedas seguir ingresando.</p>
        </div>
        <div class="modal-footer"><button class="btn btn-primary" onclick="Modal.close();Router.go('configuracion')">Comenzar configuración</button></div>
      `, {staticBackdrop:true});
      return res;
    }, {title:'Última confirmación',confirmText:'Sí, reiniciar todo',danger:true,key:'reset-system'});
  }

};
