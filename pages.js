/* ===== ALL PAGES / VIEWS ===== */
const Pages = {
  _pageSize: 10,
  _pages: {},
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
    const map={productos:['productos','prod-tbody'],historial:['historial','hist-tbody'],movimientos:['movimientos','mov-tbody'],gastos:['gastos','gasto-tbody'],empleados:['empleados','emp-tbody'],caja:['caja','cash-tbody']};
    const x=map[route]; if(x) this._paginateRows(x[0],x[1],1);
  },
  // ---------- DASHBOARD ADMIN ----------
  dashboardAdmin() {
    const salesToday = Store.salesToday();
    const totalToday = salesToday.reduce((s, x) => s + Number(x.total || 0), 0);
    const pay = Store.paymentTotals(salesToday);
    const expToday = Store.expensesToday();
    const totalExpToday = expToday.reduce((s, x) => s + Number(x.monto || 0), 0);
    const low = Store.lowStockProducts();
    const recent = [...salesToday].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).slice(0, 6);

    return `
      <div class="page-header ux-page-head">
        <div><h1 class="page-title">📊 Dashboard</h1><p class="ux-page-sub">Resumen de ventas y medios de pago de hoy</p></div>
      </div>
      ${(() => { const u=Auth.currentUser(); const c=Store.state.cashSessions.find(x=>x.usuarioId===u.id&&x.estado==='Abierta'&&x.fecha===Store.today()); return `<div class="ux-cash-banner ${c?'is-open':'is-closed'}"><div><span class="ux-status-dot"></span><strong>${c?'Caja abierta':'Caja cerrada'}</strong><small>${c?`Abierta ${Utils.formatTime(c.hora)} · Monto inicial ${Utils.formatMoney(c.montoInicial||0)}`:'Abre la caja antes de registrar ventas'}</small></div><button class="btn ${c?'btn-secondary':'btn-primary'}" onclick="Router.go('caja')">${c?'Ver caja':'Abrir caja'}</button></div>`; })()}
      <div class="ux-quick-actions">
        <button class="ux-action primary" onclick="Router.go('ventas')"><span>🛒</span><b>Nueva venta</b><small>Cobrar productos</small></button>
        <button class="ux-action" onclick="Router.go('productos')"><span>📦</span><b>Inventario</b><small>Productos y stock</small></button>
        <button class="ux-action" onclick="Router.go('gastos')"><span>💸</span><b>Registrar gasto</b><small>Control de egresos</small></button>
      </div>
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-label">💰 Ventas totales de hoy</div>
          <div class="stat-value amber">${Utils.formatMoney(totalToday)}</div>
          <div class="stat-sub">${salesToday.length} venta(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💵 Total efectivo</div>
          <div class="stat-value">${Utils.formatMoney(pay.Efectivo)}</div>
          <div class="stat-sub">Solo ventas, sin monto inicial</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📱 Yape / Plin</div>
          <div class="stat-value">${Utils.formatMoney(pay.Yape + pay.Plin)}</div>
          <div class="stat-sub">Yape ${Utils.formatMoney(pay.Yape)} · Plin ${Utils.formatMoney(pay.Plin)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💳 Tarjeta</div>
          <div class="stat-value">${Utils.formatMoney(pay.Tarjeta)}</div>
          <div class="stat-sub">Pagos con tarjeta</div>
        </div>
      </div>
      <div class="ux-mini-metrics">
        <span>💸 Gastos hoy <strong>${Utils.formatMoney(totalExpToday)}</strong></span>
        <span>⚠️ Stock bajo / agotado <strong>${low.length}</strong></span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem" class="dash-grid">
        <div class="card">
          <h3 style="margin-bottom:1rem;font-size:1.1rem">🧾 Ventas recientes</h3>
          ${recent.length === 0 ? Components.empty('🧾', 'Todavía no hay ventas registradas') : `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Empleado</th><th>Total</th><th>Método</th></tr></thead>
                <tbody>
                  ${recent.map(s => {
                    const emp = Store.getUser(s.empleadoId);
                    return `<tr>
                      <td>${Utils.formatDate(s.fecha)} ${Utils.formatTime(s.hora)}</td>
                      <td>${Utils.escapeHtml(emp ? emp.nombres : (s.empleadoNombre || '—'))}</td>
                      <td style="color:var(--amber)">${Utils.formatMoney(s.total)}</td>
                      <td>${Utils.escapeHtml(Store.salePaymentLabel(s))}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <h3 style="font-size:1.1rem">📦 Alertas de inventario</h3>
            <button class="btn btn-sm btn-secondary" onclick="Router.go('productos')">Ver inventario</button>
          </div>
          ${low.length === 0 ? Components.empty('✅', 'Todo el stock está en niveles normales') : `
            <div class="alert-list">
              ${low.map(p => {
                const st = Store.stockStatus(p);
                return `<div class="alert-item ${st === 'agotado' ? 'danger' : ''}">
                  <span style="font-size:1.3rem">${Utils.escapeHtml(p.imagen || '📦')}</span>
                  <div class="ai-name">${Utils.escapeHtml(p.nombre)}</div>
                  <div class="ai-stock">Stock: <strong>${p.stock}</strong> / mín. ${p.stockMinimo}</div>
                  ${Utils.stockBadge(st)}
                </div>`;
              }).join('')}
            </div>
          `}
        </div>
      </div>
      <style>@media(max-width:900px){ .dash-grid{ grid-template-columns:1fr !important; } }</style>
    `;
  },

  // ---------- DASHBOARD EMPLEADO ----------
  dashboardEmployee() {
    const user = Auth.currentUser();
    const today = Store.today();
    const myToday = Store.state.sales.filter(s => s.empleadoId === user.id && s.estado !== 'Anulada' && s.fecha === today);
    const totalToday = myToday.reduce((s, x) => s + Number(x.total || 0), 0);
    const itemsSold = myToday.reduce((s, sale) => s + (sale.items||[]).reduce((a, i) => a + Number(i.cantidad||0), 0), 0);
    const pay=Store.paymentTotals(myToday);
    const low = Store.lowStockProducts();

    return `
      <div class="page-header ux-page-head"><div><h1 class="page-title">🏠 Hola, ${Utils.escapeHtml(user.nombres)}</h1><p class="ux-page-sub">Tu actividad de hoy</p></div></div>
      ${(() => { const c=Store.state.cashSessions.find(x=>x.usuarioId===user.id&&x.estado==='Abierta'&&x.fecha===today); return `<div class="ux-cash-banner ${c?'is-open':'is-closed'}"><div><span class="ux-status-dot"></span><strong>${c?'Caja abierta':'Caja cerrada'}</strong><small>${c?'Ya puedes registrar ventas':'Debes abrir caja antes de vender'}</small></div><button class="btn ${c?'btn-secondary':'btn-primary'}" onclick="Router.go('caja')">${c?'Ver caja':'Abrir caja'}</button></div>`; })()}
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-label">💰 Mis ventas de hoy</div>
          <div class="stat-value amber">${Utils.formatMoney(totalToday)}</div>
          <div class="stat-sub">${myToday.length} venta(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">📦 Productos vendidos</div>
          <div class="stat-value">${itemsSold}</div>
          <div class="stat-sub">unidades</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">💵 Efectivo</div>
          <div class="stat-value">${Utils.formatMoney(pay.Efectivo)}</div>
          <div class="stat-sub">Ventas cobradas en efectivo</div>
        </div>
      </div>
      <div style="margin-bottom:1.5rem"><button class="btn btn-primary" onclick="Router.go('ventas')" style="padding:0.85rem 1.5rem;font-size:1rem">🛒 Nueva venta</button></div>
      <div class="card">
        <h3 style="margin-bottom:1rem;font-size:1.1rem">📦 Alertas de inventario</h3>
        ${low.length === 0 ? Components.empty('✅', 'Sin alertas de stock') : `
          <div class="alert-list">
            ${low.map(p => {
              const st = Store.stockStatus(p);
              return `<div class="alert-item ${st === 'agotado' ? 'danger' : ''}">
                <span style="font-size:1.3rem">${Utils.escapeHtml(p.imagen || '📦')}</span>
                <div class="ai-name">${Utils.escapeHtml(p.nombre)}</div>
                <div class="ai-stock">Stock: <strong>${p.stock}</strong></div>
                ${Utils.stockBadge(st)}
              </div>`;
            }).join('')}
          </div>
        `}
      </div>
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
    const desde=document.getElementById('mov-from')?.value||Store.daysAgo(30);
    const hasta=document.getElementById('mov-to')?.value||Store.today();
    if(desde>hasta)return Toast.show('La fecha Desde no puede ser posterior a Hasta','error');
    if(loadRange && Store.loadMovementsForRange) await Store.loadMovementsForRange(desde,hasta);
    const list=[...Store.state.movements].filter(m=>{
      const name=(Store.getProduct(m.productoId)?.nombre||m.productoNombre||'').toLowerCase();
      return String(m.fecha||'')>=desde&&String(m.fecha||'')<=hasta&&(!type||m.tipo===type)&&(!q||name.includes(q)||String(m.motivo||'').toLowerCase().includes(q));
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
        <div><h1 class="page-title">💸 Gastos</h1><p class="ux-page-sub">CRUD de gastos manuales y consulta de compras automáticas de inventario.</p></div>
        <button class="btn btn-primary" onclick="Pages.openGastoForm()">➕ Nuevo gasto</button>
      </div>
      <div class="stat-cards" style="margin-bottom:1.25rem">
        <div class="stat-card amber"><div class="stat-label">💸 Total según filtros</div><div class="stat-value amber" id="gasto-total">${Utils.formatMoney(periodTotal)}</div><div class="stat-sub" id="gasto-count">${expenses.length} registro(s)</div></div>
        <div class="stat-card"><div class="stat-label">📅 Gastos de hoy</div><div class="stat-value">${Utils.formatMoney(todayTotal)}</div></div>
      </div>
      <div class="toolbar ux-filter-grid">
        <input type="search" class="search-input" id="gasto-search" placeholder="🔎 Buscar concepto..." oninput="Pages.filterGastos()" />
        <select class="filter-select" id="gasto-cat-filter" onchange="Pages.filterGastos()">
          <option value="">Todas las categorías</option><option value="Stock">Compra de stock</option><option value="Alquiler">Alquiler</option><option value="Servicios">Servicios</option><option value="Personal">Personal</option><option value="Mantenimiento">Mantenimiento</option><option value="Otros">Otros</option>
        </select>
        <select class="filter-select" id="gasto-origin-filter" onchange="Pages.filterGastos()"><option value="">Todos los orígenes</option><option value="Manual">Manual</option><option value="auto">Inventario automático</option></select>
        <label class="ux-date-filter">Desde<input type="date" id="gasto-from" class="filter-select" value="${desde}" onchange="Pages.filterGastos(true)" /></label>
        <label class="ux-date-filter">Hasta<input type="date" id="gasto-to" class="filter-select" value="${hasta}" onchange="Pages.filterGastos(true)" /></label>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Hora</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th>Origen</th><th>Usuario</th><th>Acciones</th></tr></thead>
          <tbody id="gasto-tbody">${this._gastoRows(expenses)}</tbody>
        </table>
      </div>
    `;
  },
  _gastoRows(list) {
    if (!list.length) return `<tr><td colspan="8">${Components.empty('💸', 'No hay gastos para los filtros elegidos')}</td></tr>`;
    return list.map(e => {
      const u = Store.getUser(e.usuarioId);
      const manual=String(e.origen||'Manual')==='Manual';
      return `<tr>
        <td data-label="Fecha">${Utils.formatDate(e.fecha)}</td><td data-label="Hora">${Utils.formatTime(e.hora)}</td>
        <td data-label="Concepto">${Utils.escapeHtml(e.concepto||'—')}</td>
        <td data-label="Categoría"><span class="badge badge-neutral">${Utils.escapeHtml(e.categoria||'Otros')}</span></td>
        <td data-label="Monto" style="color:var(--amber);font-weight:600">${Utils.formatMoney(e.monto)}</td>
        <td data-label="Origen">${manual?'<span class="badge badge-accent">✍️ Manual</span>':'<span class="badge badge-success">📦 Inventario</span>'}</td>
        <td data-label="Usuario">${Utils.escapeHtml(u ? u.nombres : (e.usuarioNombre||'—'))}</td>
        <td data-label="Acciones" class="table-actions">${manual?`<button class="btn btn-sm btn-secondary" onclick="Pages.openGastoForm('${e.id}')">✏️ Editar</button><button class="btn btn-sm btn-danger" onclick="Pages.deleteGasto('${e.id}')">🗑️ Eliminar</button>`:'<span class="text-muted" title="Se conserva para mantener la trazabilidad del inventario">🔒 Automático</span>'}</td>
      </tr>`;
    }).join('');
  },
  async filterGastos(loadRange=false) {
    const q=(document.getElementById('gasto-search')?.value||'').trim().toLowerCase();
    const cat=document.getElementById('gasto-cat-filter')?.value||'';
    const origin=document.getElementById('gasto-origin-filter')?.value||'';
    const desde=document.getElementById('gasto-from')?.value||Store.daysAgo(30);
    const hasta=document.getElementById('gasto-to')?.value||Store.today();
    if(desde>hasta)return Toast.show('La fecha Desde no puede ser posterior a Hasta','error');
    if(loadRange && Store.loadExpensesForRange) await Store.loadExpensesForRange(desde,hasta);
    const list=[...Store.state.expenses].filter(e=>{
      const auto=String(e.origen||'Manual')!=='Manual';
      return String(e.fecha||'')>=desde&&String(e.fecha||'')<=hasta&&(!q||String(e.concepto||'').toLowerCase().includes(q))&&(!cat||e.categoria===cat)&&(!origin||(origin==='Manual'?!auto:auto));
    }).sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));
    const tbody=document.getElementById('gasto-tbody');
    if(tbody){tbody.innerHTML=this._gastoRows(list);App.makeTablesMobileFriendly(tbody.closest('.table-wrap')||document);this._paginateRows('gastos','gasto-tbody',1);}
    const total=list.reduce((s,e)=>s+Number(e.monto||0),0);
    const totalEl=document.getElementById('gasto-total'),countEl=document.getElementById('gasto-count');
    if(totalEl)totalEl.textContent=Utils.formatMoney(total);
    if(countEl)countEl.textContent=`${list.length} registro(s)`;
  },
  openGastoForm(id='') {
    const e=id?Store.state.expenses.find(x=>x.id===id):null;
    if(e && String(e.origen||'Manual')!=='Manual')return Toast.show('Los gastos automáticos de inventario son de solo lectura','error');
    Modal.open(`
      <div class="modal-header"><h2>${e?'✏️ Editar gasto':'➕ Nuevo gasto'}</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>Concepto / descripción *</label><input type="text" id="gasto-concepto" required placeholder="Ej. Pago de luz" value="${Utils.escapeHtml(e?.concepto||'')}" /></div>
        <div class="form-group"><label>Categoría *</label><select id="gasto-categoria">
          ${['Alquiler','Servicios','Personal','Mantenimiento','Otros'].map(c=>`<option value="${c}" ${e?.categoria===c?'selected':''}>${c}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Monto (S/) *</label><input type="number" id="gasto-monto" step="0.01" min="0.01" required value="${e?Number(e.monto||0).toFixed(2):''}" /></div>
        <p style="font-size:0.8rem;color:var(--text-muted)">${e?'Se conservarán la fecha, hora y usuario originales.':'La fecha y hora se registran automáticamente al confirmar.'}</p>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="Pages.saveGasto('${id}')">${e?'Guardar cambios':'Registrar'}</button></div>
    `);
  },
  async saveGasto(id='') {
    const concepto=(document.getElementById('gasto-concepto')?.value||'').trim();
    const categoria=document.getElementById('gasto-categoria')?.value||'Otros';
    const monto=Number(document.getElementById('gasto-monto')?.value);
    if(!concepto||!Number.isFinite(monto)||monto<=0)return Toast.show('Completa concepto y monto válido','error');
    return confirmAction(`${id?'Guardar cambios del gasto':'Registrar el gasto'} “${concepto}” por ${Utils.formatMoney(monto)}. ¿Confirmar?`,async()=>{
      const r=id?await Store.updateExpense(id,{concepto,categoria,monto}):await Store.addExpense({concepto,categoria,monto});
      if(!r.ok){Toast.show(r.error||'No se pudo guardar el gasto','error');return r;}
      Modal.close();Toast.show(id?'Gasto actualizado':'Gasto registrado');Router.go('gastos');return r;
    },{title:id?'Confirmar edición':'Confirmar gasto',confirmText:id?'Guardar cambios':'Registrar gasto',danger:false,key:'gasto:'+id});
  },
  deleteGasto(id) {
    const e=Store.state.expenses.find(x=>x.id===id);if(!e)return Toast.show('Gasto no encontrado','error');
    confirmAction(`Eliminar el gasto “${e.concepto||''}” por ${Utils.formatMoney(e.monto)}. Esta acción no se puede deshacer.`,async()=>{
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
            <input type="search" class="search-input" id="sale-search" placeholder="Buscar producto..." oninput="Pages.filterSaleProducts()" style="max-width:100%" />
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
    const q = (document.getElementById('sale-search')?.value || '').toLowerCase();
    const products = Store.state.products.filter(p => p.estado === 'Activo' && (!q || p.nombre.toLowerCase().includes(q)));
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
      document.getElementById('main-content').innerHTML = this.ventas();
    }
  },
  openPago() {
    const total = Store.getCartTotal();
    if (Store.state.cart.length === 0) return;
    const u = Auth.currentUser(), hoy = Store.today();
    const cajaAbierta = Store.state.cashSessions.find(c => c.usuarioId === u.id && c.estado === 'Abierta' && c.fecha === hoy);
    if (!cajaAbierta) {
      Modal.open(`<div class="modal-header"><h2>⚠️ Caja cerrada</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div><div class="modal-body"><p>Antes de registrar una venta debes <strong>abrir la caja del día</strong>.</p></div><div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="Modal.close();Router.go('caja')">Ir a Caja</button></div>`);
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
    const valid=sales.filter(x=>x.estado!=='Anulada'),total=valid.reduce((sum,x)=>sum+Number(x.total||0),0);
    return `
      <div class="page-header"><div><h1 class="page-title">🧾 ${Auth.isAdmin()?'Historial de ventas':'Mis ventas'}</h1><p class="ux-page-sub">El total cambia automáticamente según el rango y los filtros seleccionados.</p></div></div>
      <div class="stat-cards" style="margin-bottom:1.25rem"><div class="stat-card"><div class="stat-label">💰 Total de ventas filtradas</div><div class="stat-value amber" id="hist-total">${Utils.formatMoney(total)}</div><div class="stat-sub" id="hist-count">${valid.length} venta(s) válida(s)</div></div></div>
      <div class="toolbar ux-filter-grid">
        <input type="search" class="search-input" id="hist-search" placeholder="🔎 Buscar..." oninput="Pages.filterHistorial()" />
        <select class="filter-select" id="hist-method" onchange="Pages.filterHistorial()"><option value="">Todos los métodos</option><option value="Efectivo">Efectivo</option><option value="Yape">Yape</option><option value="Plin">Plin</option><option value="Tarjeta">Tarjeta</option></select>
        <label class="ux-date-filter">Desde<input type="date" id="hist-from" class="filter-select" value="${desde}" onchange="Pages.filterHistorial(true)" /></label>
        <label class="ux-date-filter">Hasta<input type="date" id="hist-to" class="filter-select" value="${hasta}" onchange="Pages.filterHistorial(true)" /></label>
      </div>
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
  async filterHistorial(loadRange=false) {
    const method=(document.getElementById('hist-method')?.value||'').trim();
    const desde=document.getElementById('hist-from')?.value||Store.daysAgo(30),hasta=document.getElementById('hist-to')?.value||Store.today();
    if(desde>hasta)return Toast.show('La fecha Desde no puede ser posterior a Hasta','error');
    if(loadRange&&Store.loadSalesForRange)await Store.loadSalesForRange(desde,hasta);
    const q=(document.getElementById('hist-search')?.value||'').trim().toLowerCase(),user=Auth.currentUser();
    let sales=[...Store.state.sales];if(Auth.isEmployee())sales=sales.filter(s=>s.empleadoId===user.id);
    sales=sales.filter(s=>{
      const emp=Store.getUser(s.empleadoId),products=(Array.isArray(s.items)?s.items:[]).map(i=>Store.getProduct(i.productoId)?.nombre||i?.nombre||'').join(' ');
      const haystack=`${s.numero||s.id||''} ${emp?.nombres||s.empleadoNombre||''} ${emp?.apellidos||''} ${products} ${Store.salePaymentLabel(s)}`.toLowerCase();
      const methods=Store.getSalePayments(s).map(p=>p.metodo);
      return String(s.fecha||'')>=desde&&String(s.fecha||'')<=hasta&&(!method||methods.includes(method))&&(!q||haystack.includes(q));
    }).sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));
    const tbody=document.getElementById('hist-tbody');if(tbody){tbody.innerHTML=this._histRows(sales);App.makeTablesMobileFriendly(tbody.closest('.table-wrap')||document);this._paginateRows('historial','hist-tbody',1);}
    const valid=sales.filter(s=>s.estado!=='Anulada'),total=valid.reduce((sum,s)=>sum+Number(s.total||0),0);
    const totalEl=document.getElementById('hist-total'),countEl=document.getElementById('hist-count');if(totalEl)totalEl.textContent=Utils.formatMoney(total);if(countEl)countEl.textContent=`${valid.length} venta(s) válida(s)`;
  },
  showSaleDetail(id) {
    const s=Store.state.sales.find(x=>x.id===id);if(!s)return;
    const emp=Store.getUser(s.empleadoId),pagos=Store.getSalePayments(s);
    Modal.open(`
      <div class="modal-header"><h2>🧾 Detalle de venta ${Utils.escapeHtml(s.numero||s.id)}</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <div class="detail-row"><span class="dr-label">Fecha</span><span class="dr-value">${Utils.formatDate(s.fecha)} ${Utils.formatTime(s.hora)}</span></div>
        <div class="detail-row"><span class="dr-label">Empleado</span><span class="dr-value">${Utils.escapeHtml(emp?`${emp.nombres} ${emp.apellidos}`:(s.empleadoNombre||'—'))}</span></div>
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
    const u=Auth.currentUser(),abierta=Store.state.cashSessions.find(c=>c.usuarioId===u.id&&c.estado==='Abierta');
    const hoy=Store.today(),fechaCaja=abierta?.fecha||hoy;
    const ventasHoy=Store.state.sales.filter(s=>s.empleadoId===u.id&&s.fecha===fechaCaja&&s.estado!=='Anulada'&&(!abierta||!s.cajaId||s.cajaId===abierta.id));
    const pay=Store.paymentTotals(ventasHoy),efectivo=pay.Efectivo,yape=pay.Yape,plin=pay.Plin,tarjeta=pay.Tarjeta,totalDia=+(efectivo+yape+plin+tarjeta).toFixed(2);
    const montoInicial=Number(abierta?.montoInicial||0),esperado=+(montoInicial+efectivo).toFixed(2);
    const hist=[...Store.state.cashSessions].filter(c=>Auth.isAdmin()||c.usuarioId===u.id).sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));
    const cajaAnterior=abierta&&abierta.fecha!==hoy;
    const metricasCaja=c=>{
      const sales=Store.state.sales.filter(s=>s.cajaId===c.id&&s.estado!=='Anulada'),calc=Store.paymentTotals(sales);
      const fallbackTotal=calc.Efectivo+calc.Yape+calc.Plin+calc.Tarjeta;
      return{total:c.totalVentasDia==null?fallbackTotal:Number(c.totalVentasDia||0),efectivo:c.efectivoVentas==null?calc.Efectivo:Number(c.efectivoVentas||0),yape:c.yapeVentas==null?calc.Yape:Number(c.yapeVentas||0),plin:c.plinVentas==null?calc.Plin:Number(c.plinVentas||0),tarjeta:c.tarjetaVentas==null?calc.Tarjeta:Number(c.tarjetaVentas||0)};
    };
    const historyRows=hist.map(c=>{
      const m=metricasCaja(c),isOpen=c.estado==='Abierta',diff=c.diferencia==null?null:Number(c.diferencia||0);
      const status=isOpen?'<span class="badge badge-success">● Abierta</span>':'<span class="badge badge-neutral">Cerrada</span>';
      const diffHtml=isOpen?'<span class="badge badge-warning">Pendiente</span>':Math.abs(diff||0)<0.005?'<span class="badge badge-success">S/ 0.00</span>':`<span class="badge ${diff<0?'badge-danger':'badge-warning'}">${diff>0?'+':''}${Utils.formatMoney(diff)}</span>`;
      return `<tr class="${isOpen?'ux-cash-row-open':''}"><td data-label="Apertura"><div class="ux-cash-date"><strong>${Utils.formatDate(c.fecha)}</strong><small>${Utils.formatTime(c.hora)}</small></div></td><td data-label="Usuario"><strong>${Utils.escapeHtml(c.usuarioNombre||'—')}</strong></td><td data-label="Monto inicial"><strong>${Utils.formatMoney(c.montoInicial||0)}</strong></td><td data-label="Ventas"><strong class="ux-money-cell">${Utils.formatMoney(m.total)}</strong></td><td data-label="Efectivo ventas">${Utils.formatMoney(m.efectivo)}</td><td data-label="Yape / Plin"><div class="ux-split-payment"><span>Yape <strong>${Utils.formatMoney(m.yape)}</strong></span><span>Plin <strong>${Utils.formatMoney(m.plin)}</strong></span></div></td><td data-label="Tarjeta">${Utils.formatMoney(m.tarjeta)}</td><td data-label="Estado">${status}</td><td data-label="Diferencia">${diffHtml}</td></tr>`;
    }).join('')||'<tr><td colspan="9">Sin registros de caja</td></tr>';
    return `<div class="page-header ux-page-head"><div><h1 class="page-title">💰 Caja</h1><p class="ux-page-sub">El monto inicial queda registrado por separado y nunca se suma a las ventas.</p></div></div>
      ${cajaAnterior?`<div class="alert alert-warning"><strong>⚠️ Caja pendiente del ${Utils.formatDate(abierta.fecha)}</strong><br>Ciérrala antes de registrar ventas de hoy.</div>`:''}
      <div class="ux-cash-hero ${abierta?'is-open':'is-closed'}"><div class="ux-cash-state"><span class="ux-status-dot"></span><div><small>ESTADO ACTUAL</small><h2>${abierta?'CAJA ABIERTA':'CAJA CERRADA'}</h2><p>${abierta?`Apertura ${Utils.formatTime(abierta.hora)} · Monto inicial ${Utils.formatMoney(montoInicial)}`:'Abre una caja para comenzar a vender'}</p></div></div></div>
      <div class="stat-cards ux-payment-summary">
        <div class="stat-card"><div class="stat-label">💰 Total vendido</div><div class="stat-value amber">${Utils.formatMoney(totalDia)}</div><div class="stat-sub">${ventasHoy.length} venta(s) · no incluye apertura</div></div>
        <div class="stat-card"><div class="stat-label">🏁 Monto inicial</div><div class="stat-value">${Utils.formatMoney(montoInicial)}</div><div class="stat-sub">Registro de apertura</div></div>
        <div class="stat-card"><div class="stat-label">💵 Efectivo de ventas</div><div class="stat-value">${Utils.formatMoney(efectivo)}</div><div class="stat-sub">Efectivo esperado total: ${Utils.formatMoney(esperado)}</div></div>
        <div class="stat-card"><div class="stat-label">📱 Yape / Plin</div><div class="stat-value">${Utils.formatMoney(yape+plin)}</div><div class="stat-sub">${Utils.formatMoney(yape)} / ${Utils.formatMoney(plin)}</div></div>
        <div class="stat-card"><div class="stat-label">💳 Tarjeta</div><div class="stat-value">${Utils.formatMoney(tarjeta)}</div><div class="stat-sub">Pagos electrónicos</div></div>
      </div>
      <div class="ux-cash-layout">
        <div class="card ux-cash-action"><h3>${abierta?'🔒 Cerrar caja':'🔓 Abrir caja'}</h3>${abierta?`<div class="ux-money-row"><span>Monto inicial</span><strong>${Utils.formatMoney(montoInicial)}</strong></div><div class="ux-money-row"><span>Ventas en efectivo</span><strong>${Utils.formatMoney(efectivo)}</strong></div><div class="ux-money-row"><span>Efectivo esperado</span><strong>${Utils.formatMoney(esperado)}</strong></div><label class="form-label">Efectivo real contado</label><input id="cash-real" class="form-control" type="number" min="0" step="0.01" value="${esperado.toFixed(2)}"><p class="ux-help">El cierre compara: monto inicial + ventas en efectivo vs. efectivo real contado.</p><button id="btn-close-cash" class="btn btn-danger btn-full" onclick="Pages.closeCash()">Cerrar caja</button>`:`<label class="form-label">Monto inicial en efectivo</label><input id="cash-initial" class="form-control" type="number" min="0" step="0.01" value="0"><p class="ux-help">Se guardará como apertura, separado de las ventas.</p><button id="btn-open-cash" class="btn btn-primary btn-full" onclick="Pages.openCash()">Abrir caja y comenzar</button>`}</div>
        <div class="card ux-cash-history-card"><div class="ux-section-head ux-cash-history-head"><div><h3>📚 Historial de caja</h3><p>Apertura, ventas, medios de pago y diferencias</p></div><span class="ux-history-count">${hist.length} sesión${hist.length===1?'':'es'}</span></div><div class="table-wrap ux-cash-history"><table><thead><tr><th>Apertura</th><th>Usuario</th><th>Monto inicial</th><th>Ventas</th><th>Efectivo ventas</th><th>Yape / Plin</th><th>Tarjeta</th><th>Estado</th><th>Diferencia</th></tr></thead><tbody id="cash-tbody">${historyRows}</tbody></table></div></div>
      </div>`;
  },
  openCash(){const v=Number(document.getElementById('cash-initial')?.value);if(!Number.isFinite(v)||v<0)return Toast.show('Ingresa un monto inicial válido','error');confirmAction(`Abrir caja con ${Utils.formatMoney(v)} de efectivo inicial. ¿Confirmar?`,async()=>{const r=await Store.openCash(v);Toast.show(r.ok?'Caja abierta':r.error,r.ok?'success':'error');if(r.ok){SetupGuide.mark('cashOpened');Modal.close();Router.go('caja')}return r;},{title:'Confirmar apertura de caja',confirmText:'Abrir caja',danger:false,key:'open-cash'});},
  closeCash(){const v=Number(document.getElementById('cash-real')?.value);if(!Number.isFinite(v)||v<0)return Toast.show('Ingresa un efectivo real válido','error');confirmAction(`Cerrar la caja declarando ${Utils.formatMoney(v)} de efectivo contado. Esta acción finalizará la sesión de caja.`,async()=>{const r=await Store.closeCash(v);Toast.show(r.ok?`Caja cerrada. Diferencia: ${Utils.formatMoney(r.diferencia)}`:r.error,r.ok?'success':'error');if(r.ok){Modal.close();Router.go('caja')}return r;},{title:'Confirmar cierre de caja',confirmText:'Cerrar caja',danger:true,key:'close-cash'});},
  reportes(){
    if(!Auth.requireAdmin())return '';
    const desde=Store.daysAgo(30),sales=Store.state.sales.filter(s=>s.estado!=='Anulada'&&s.fecha>=desde),ventas=sales.reduce((a,b)=>a+Number(b.total||0),0),costo=sales.reduce((a,b)=>a+Number(b.costoTotal||0),0),exp=Store.state.expenses.filter(e=>e.fecha>=desde),gastos=exp.reduce((a,b)=>a+Number(b.monto||0),0),util=ventas-costo-gastos,pay=Store.paymentTotals(sales);
    return `<div class="page-header"><div><h1 class="page-title">📈 Reportes</h1><p class="ux-page-sub">Resumen de los últimos 31 días.</p></div></div><div class="row g-3"><div class="col-6 col-lg-3"><div class="card p-3"><small>💰 Ventas</small><h3>${Utils.formatMoney(ventas)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>📦 Costo vendido</small><h3>${Utils.formatMoney(costo)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>💸 Gastos</small><h3>${Utils.formatMoney(gastos)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>📊 Resultado estimado</small><h3>${Utils.formatMoney(util)}</h3></div></div></div><div class="card p-3 mt-3"><h5>💳 Ventas por método</h5>${['Efectivo','Yape','Plin','Tarjeta'].map(k=>`<div class="d-flex justify-content-between border-bottom py-2"><span>${k}</span><strong>${Utils.formatMoney(pay[k])}</strong></div>`).join('')}</div>`;
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
        ${step(5,'💰','Abrir la primera caja','Abre una caja para comprobar que el flujo de ventas está listo.',setup.cashOpened,setup.hasStock,'caja')}
        ${step(6,'🛒','Venta de prueba','Realiza una venta de prueba. Si no deseas generar una venta, puedes omitir este paso.',setup.saleDone || setup.saleSkipped,setup.cashOpened,'ventas')}
      </div>
      ${setup.cashOpened && !setup.saleDone && !setup.saleSkipped ? '<div class="setup-inline-actions"><button class="btn btn-secondary" onclick="Pages.skipSetupSale()">Omitir venta de prueba</button></div>' : ''}
      <div class="setup-finish">
        <div><strong>${setup.canFinish ? 'Todo listo para empezar' : 'Completa los pasos obligatorios'}</strong><p>${setup.canFinish ? 'Finaliza el tutorial para habilitar todos los apartados sin restricciones.' : 'Categoría, producto, stock, caja y venta de prueba (o su omisión) son necesarios.'}</p></div>
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
