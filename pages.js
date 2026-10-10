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
    const totalToday = salesToday.reduce((s, x) => s + x.total, 0);
    const allSales = salesToday;
    const totalAll = totalToday;
    const ticketPromedio = salesToday.length ? totalToday / salesToday.length : 0;
    const expToday = Store.expensesToday();
    const totalExpToday = expToday.reduce((s, x) => s + x.monto, 0);
    const low = Store.lowStockProducts();

    const recent = [...allSales].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).slice(0, 6);

    return `
      <div class="page-header ux-page-head">
        <div><h1 class="page-title">Inicio</h1><p class="ux-page-sub">Resumen de hoy y accesos rápidos</p></div>
      </div>
      ${(() => { const u=Auth.currentUser(); const c=Store.state.cashSessions.find(x=>x.usuarioId===u.id&&x.estado==='Abierta'&&x.fecha===Store.today()); return `<div class="ux-cash-banner ${c?'is-open':'is-closed'}"><div><span class="ux-status-dot"></span><strong>${c?'Caja abierta':'Caja cerrada'}</strong><small>${c?`Abierta ${String(c.hora||'').slice(0,5)} · Inicial ${Utils.formatMoney(c.montoInicial||0)}`:'Abre la caja antes de registrar ventas'}</small></div><button class="btn ${c?'btn-secondary':'btn-primary'}" onclick="Router.go('caja')">${c?'Ver caja':'Abrir caja'}</button></div>`; })()}
      <div class="ux-quick-actions">
        <button class="ux-action primary" onclick="Router.go('ventas')"><span>🛒</span><b>Nueva venta</b><small>Cobrar productos</small></button>
        <button class="ux-action" onclick="Router.go('productos')"><span>📦</span><b>Agregar stock</b><small>Productos existentes</small></button>
        <button class="ux-action" onclick="Router.go('gastos')"><span>💸</span><b>Registrar gasto</b><small>Control de egresos</small></button>
      </div>
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-label">Ventas de hoy</div>
          <div class="stat-value amber">${Utils.formatMoney(totalToday)}</div>
          <div class="stat-sub">${salesToday.length} venta(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ticket promedio hoy</div>
          <div class="stat-value">${Utils.formatMoney(ticketPromedio)}</div>
          <div class="stat-sub">${allSales.length} venta(s) de hoy</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-label">Gastos de hoy</div>
          <div class="stat-value amber">${Utils.formatMoney(totalExpToday)}</div>
          <div class="stat-sub">${expToday.length} registro(s)</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Stock bajo / agotado</div>
          <div class="stat-value">${low.length}</div>
          <div class="stat-sub">productos</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem" class="dash-grid">
        <div class="card">
          <h3 style="margin-bottom:1rem;font-size:1.1rem">Ventas recientes</h3>
          ${recent.length === 0 ? Components.empty('🧾', 'Todavía no hay ventas registradas') : `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Empleado</th><th>Total</th><th>Método</th></tr></thead>
                <tbody>
                  ${recent.map(s => {
                    const emp = Store.getUser(s.empleadoId);
                    return `<tr>
                      <td>${Utils.formatDate(s.fecha)} ${String(s.hora||'—').slice(0,5)}</td>
                      <td>${Utils.escapeHtml(emp ? emp.nombres : (s.empleadoNombre || '—'))}</td>
                      <td style="color:var(--amber)">${Utils.formatMoney(s.total)}</td>
                      <td>${s.metodoPago}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <h3 style="font-size:1.1rem">Alertas de stock</h3>
            <button class="btn btn-sm btn-secondary" onclick="Router.go('productos')">Ver productos</button>
          </div>
          ${low.length === 0 ? Components.empty('✅', 'Todo el stock está en niveles normales') : `
            <div class="alert-list">
              ${low.map(p => {
                const st = Store.stockStatus(p);
                return `<div class="alert-item ${st === 'agotado' ? 'danger' : ''}">
                  <span style="font-size:1.3rem">${p.imagen || '📦'}</span>
                  <div class="ai-name">${Utils.escapeHtml(p.nombre)}</div>
                  <div class="ai-stock">Stock: <strong>${p.stock}</strong> / mín. ${p.stockMinimo}</div>
                  ${Utils.stockBadge(st)}
                </div>`;
              }).join('')}
            </div>
          `}
        </div>
      </div>
      <style>
        @media(max-width:900px){ .dash-grid{ grid-template-columns:1fr !important; } }
      </style>
    `;
  },

  // ---------- DASHBOARD EMPLEADO ----------
  dashboardEmployee() {
    const user = Auth.currentUser();
    const today = Store.today();
    const myToday = Store.state.sales.filter(s => s.empleadoId === user.id && s.estado !== 'Anulada' && s.fecha === today);
    const totalToday = myToday.reduce((s, x) => s + x.total, 0);
    const ticketPromedio = myToday.length ? totalToday / myToday.length : 0;
    const itemsSold = myToday.reduce((s, sale) => s + (sale.items||[]).reduce((a, i) => a + i.cantidad, 0), 0);
    const low = Store.lowStockProducts();

    return `
      <div class="page-header ux-page-head"><div><h1 class="page-title">Hola, ${Utils.escapeHtml(user.nombres)}</h1><p class="ux-page-sub">Tu actividad de hoy</p></div></div>
      ${(() => { const c=Store.state.cashSessions.find(x=>x.usuarioId===user.id&&x.estado==='Abierta'&&x.fecha===today); return `<div class="ux-cash-banner ${c?'is-open':'is-closed'}"><div><span class="ux-status-dot"></span><strong>${c?'Caja abierta':'Caja cerrada'}</strong><small>${c?'Ya puedes registrar ventas':'Debes abrir caja antes de vender'}</small></div><button class="btn ${c?'btn-secondary':'btn-primary'}" onclick="Router.go('caja')">${c?'Ver caja':'Abrir caja'}</button></div>`; })()}
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-label">Mis ventas de hoy</div>
          <div class="stat-value amber">${Utils.formatMoney(totalToday)}</div>
          <div class="stat-sub">${myToday.length} venta(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ticket promedio hoy</div>
          <div class="stat-value">${Utils.formatMoney(ticketPromedio)}</div>
          <div class="stat-sub">Solo actividad de hoy</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Productos vendidos</div>
          <div class="stat-value">${itemsSold}</div>
          <div class="stat-sub">unidades</div>
        </div>
      </div>
      <div style="margin-bottom:1.5rem">
        <button class="btn btn-primary" onclick="Router.go('ventas')" style="padding:0.85rem 1.5rem;font-size:1rem">
          🛒 Nueva venta
        </button>
      </div>
      <div class="card">
        <h3 style="margin-bottom:1rem;font-size:1.1rem">Alertas de stock</h3>
        ${low.length === 0 ? Components.empty('✅', 'Sin alertas de stock') : `
          <div class="alert-list">
            ${low.map(p => {
              const st = Store.stockStatus(p);
              return `<div class="alert-item ${st === 'agotado' ? 'danger' : ''}">
                <span style="font-size:1.3rem">${p.imagen || '📦'}</span>
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
    if (id) {
      const estado = document.getElementById('cat-estado')?.value;
      await Store.updateCategory(id, { nombre, estado });
      Toast.show('Categoría actualizada');
    } else {
      await Store.addCategory(nombre);
      Toast.show('Categoría creada');
    }
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

  // ---------- PRODUCTOS ----------
  productos() {
    if (!Auth.requireAdmin()) return '';
    const products = Store.state.products;
    const cats = Store.state.categories.filter(c => c.estado === 'Activo');
    return `
      <div class="page-header">
        <h1 class="page-title">Productos</h1>
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
      { id:'cervezas', nombre:'Cervezas y bar', keywords:'cerveza chela bar botella alcohol trago copa', icons:'🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾 🧉 🍶 🫗 🧊 🪣'.split(' ') },
      { id:'bebidas', nombre:'Bebidas', keywords:'bebida gaseosa soda refresco agua jugo cafe te vaso botella lata', icons:'🥤 🧃 🧋 ☕ 🍵 🫖 🥛 🍼 🧴 🚰 💧 🫧 🥥 🍋 🍊'.split(' ') },
      { id:'frutas', nombre:'Frutas y sabores', keywords:'fruta limon naranja fresa uva pina coco sandia cereza manzana sabor', icons:'🍋 🍊 🍓 🍇 🍍 🥥 🍉 🍒 🍎 🍏 🍑 🥭 🫐 🍌 🥝 🍈 🍐'.split(' ') },
      { id:'comidas', nombre:'Comidas', keywords:'comida hamburguesa pizza pollo carne hotdog sandwich taco parrilla', icons:'🍔 🍟 🌭 🍕 🥪 🌮 🌯 🥙 🍗 🍖 🥩 🍤 🍣 🍱 🍜 🍝 🍛 🥘 🥗'.split(' ') },
      { id:'piqueos', nombre:'Piqueos y snacks', keywords:'piqueo snack canchita mani papas queso galleta dulce chocolate', icons:'🍿 🥜 🫘 🫒 🧀 🥨 🍪 🍫 🍬 🍭 🧁 🍰 🍩 🥠 🥟 🍘 🍙'.split(' ') },
      { id:'desayuno', nombre:'Pan y desayuno', keywords:'pan desayuno huevo tostada croissant sandwich', icons:'🥐 🥖 🍞 🥯 🥞 🧇 🍳 🥚 🥓 🥪 🧈 🍯'.split(' ') },
      { id:'helados', nombre:'Helados y postres', keywords:'helado postre dulce torta pastel', icons:'🍦 🍧 🍨 🍮 🍰 🎂 🧁 🍩 🍪 🍫 🍬 🍡'.split(' ') },
      { id:'combos', nombre:'Combos y promociones', keywords:'combo promocion oferta descuento especial nuevo estrella fuego regalo', icons:'🔥 ⭐ 🌟 ✨ 💥 🎉 🎊 🎁 🏷️ 💰 💵 💸 🪙 ✅ 💯 🆕 ❤️'.split(' ') },
      { id:'musica', nombre:'Bar y entretenimiento', keywords:'musica fiesta karaoke billar dardos noche baile', icons:'🎵 🎶 🎤 🎧 🎸 🪩 🎉 🎯 🎱 🎲 🃏 🎮 📺 🌙'.split(' ') },
      { id:'envases', nombre:'Envases y servicio', keywords:'vaso copa plato cubiertos bolsa caja delivery envase', icons:'🥄 🍴 🍽️ 🥢 🥡 🥣 🫙 🧂 🧃 🥤 🛍️ 📦 🥫 🧺'.split(' ') },
      { id:'tienda', nombre:'Tienda y varios', keywords:'tienda varios paquete caja producto higiene', icons:'📦 🛒 🛍️ 🧻 🧼 🧽 🪥 🧴 🔋 💡 🕯️ 🧯 🧰 🧹'.split(' ') },
      { id:'numeros', nombre:'Números y packs', keywords:'pack unidad unidades uno dos tres cuatro cinco seis caja docena', icons:'1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 #️⃣ *️⃣'.split(' ') },
      { id:'formas', nombre:'Colores y símbolos', keywords:'color circulo cuadrado rojo azul verde amarillo negro blanco simbolo', icons:'🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ ❤️ 💚 💙 💜 🧡'.split(' ') },
      { id:'otros', nombre:'Otros', keywords:'otro favorito premium rapido importante disponible', icons:'📌 📍 🏆 🥇 👑 💎 🚀 ⚡ ☀️ 🌙 🌈 🎀 🪄 🔔 🔥 ⭐ ✅'.split(' ') }
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
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">Stock actual: <strong>${p.stock}</strong>. Para agregar unidades usa el botón <strong>+ Stock</strong> en Productos; la compra generará automáticamente su gasto.</p>
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
        <div class="form-group"><label>Costo unitario (S/) *</label><input type="number" id="stock-add-cost" min="0" step="0.01" value="${Number(p.precioCompra || 0).toFixed(2)}" oninput="Pages.updateAddStockPreview()" /></div>
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
    const movs = [...Store.state.movements].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    return `
      <div class="page-header">
        <div><h1 class="page-title">Movimientos de stock</h1><p class="ux-page-sub">Mostrando hasta 250 movimientos de los últimos 31 días.</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Fecha</th><th>Hora</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock ant.</th><th>Stock nuevo</th><th>Usuario</th></tr>
          </thead>
          <tbody id="mov-tbody">
            ${movs.length === 0 ? `<tr><td colspan="8">${Components.empty('📋', 'No hay movimientos')}</td></tr>` :
              movs.map(m => {
                const p = Store.getProduct(m.productoId);
                const u = Store.getUser(m.usuarioId);
                const tipoBadge = m.tipo === 'Venta' ? 'badge-accent' : m.tipo === 'Entrada' ? 'badge-success' : 'badge-warning';
                return `<tr>
                  <td data-label="Fecha">${Utils.formatDate(m.fecha)}</td>
                  <td data-label="Hora">${m.hora.slice(0,5)}</td>
                  <td data-label="Producto">${Utils.escapeHtml(p?.nombre || '—')}</td>
                  <td data-label="Tipo"><span class="badge ${tipoBadge}">${m.tipo}</span></td>
                  <td data-label="Cantidad">${m.cantidad}</td>
                  <td data-label="Stock ant.">${m.stockAnterior}</td>
                  <td data-label="Stock nuevo"><strong>${m.stockNuevo}</strong></td>
                  <td data-label="Usuario">${Utils.escapeHtml(u ? u.nombres : '—')}</td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ---------- GASTOS ----------
  gastos() {
    if (!Auth.requireAdmin()) return '';
    const expenses = [...Store.state.expenses].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    const todayTotal = Store.expensesToday().reduce((s, e) => s + e.monto, 0);
    const allTotal = Store.totalExpenses();
    return `
      <div class="page-header">
        <h1 class="page-title">Gastos</h1>
        <button class="btn btn-primary" onclick="Pages.openGastoForm()">+ Nuevo gasto</button>
      </div>
      <div class="stat-cards" style="margin-bottom:1.25rem">
        <div class="stat-card amber">
          <div class="stat-label">Gastos de hoy</div>
          <div class="stat-value amber">${Utils.formatMoney(todayTotal)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Gastos últimos 31 días</div>
          <div class="stat-value">${Utils.formatMoney(allTotal)}</div>
        </div>
      </div>
      <div class="toolbar">
        <input type="search" class="search-input" id="gasto-search" placeholder="Buscar por concepto..." oninput="Pages.filterGastos()" />
        <select class="filter-select" id="gasto-cat-filter" onchange="Pages.filterGastos()">
          <option value="">Todas las categorías</option>
          <option value="Stock">Compra de stock</option>
          <option value="Alquiler">Alquiler</option>
          <option value="Servicios">Servicios</option>
          <option value="Personal">Personal</option>
          <option value="Mantenimiento">Mantenimiento</option>
          <option value="Otros">Otros</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Fecha</th><th>Hora</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th>Origen</th><th>Usuario</th></tr>
          </thead>
          <tbody id="gasto-tbody">
            ${this._gastoRows(expenses)}
          </tbody>
        </table>
      </div>
    `;
  },
  _gastoRows(list) {
    if (!list.length) return `<tr><td colspan="7">${Components.empty('💸', 'No hay gastos registrados')}</td></tr>`;
    return list.map(e => {
      const u = Store.getUser(e.usuarioId);
      return `<tr data-concept="${e.concepto.toLowerCase()}" data-cat="${e.categoria}">
        <td data-label="Fecha">${Utils.formatDate(e.fecha)}</td>
        <td data-label="Hora">${e.hora.slice(0,5)}</td>
        <td data-label="Concepto">${Utils.escapeHtml(e.concepto)}</td>
        <td data-label="Categoría"><span class="badge badge-neutral">${Utils.escapeHtml(e.categoria)}</span></td>
        <td data-label="Monto" style="color:var(--amber);font-weight:600">${Utils.formatMoney(e.monto)}</td>
        <td data-label="Origen">${e.origen === 'Manual' ? '<span class="badge badge-accent">Manual</span>' : '<span class="badge badge-success">Compra de stock</span>'}</td>
        <td data-label="Usuario">${Utils.escapeHtml(u ? u.nombres : '—')}</td>
      </tr>`;
    }).join('');
  },
  filterGastos() {
    const q = (document.getElementById('gasto-search')?.value || '').toLowerCase();
    const cat = document.getElementById('gasto-cat-filter')?.value || '';
    const list=[...Store.state.expenses].sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`)).filter(e=>(!q||String(e.concepto||'').toLowerCase().includes(q))&&(!cat||e.categoria===cat));
    const tbody=document.getElementById('gasto-tbody');
    if(tbody){tbody.innerHTML=this._gastoRows(list); App.makeTablesMobileFriendly(tbody.closest('.table-wrap')||document); this._paginateRows('gastos','gasto-tbody',1);}
  },
  openGastoForm() {
    Modal.open(`
      <div class="modal-header">
        <h2>Nuevo gasto</h2>
        <button class="btn-icon" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Concepto / descripción *</label>
          <input type="text" id="gasto-concepto" required placeholder="Ej. Pago de luz" />
        </div>
        <div class="form-group">
          <label>Categoría *</label>
          <select id="gasto-categoria">
            <option value="Alquiler">Alquiler</option>
            <option value="Servicios">Servicios</option>
            <option value="Personal">Personal</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        <div class="form-group">
          <label>Monto (S/) *</label>
          <input type="number" id="gasto-monto" step="0.01" min="0.01" required />
        </div>
        <p style="font-size:0.8rem;color:var(--text-muted)">La fecha y hora se registran automáticamente al confirmar.</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-primary" onclick="Pages.saveGasto()">Registrar</button>
      </div>
    `);
  },
  async saveGasto() {
    const concepto = document.getElementById('gasto-concepto').value.trim();
    const categoria = document.getElementById('gasto-categoria').value;
    const monto = Number(document.getElementById('gasto-monto').value);
    if (!concepto || !monto || monto <= 0) {
      Toast.show('Completa concepto y monto válido', 'error');
      return;
    }
    return confirmAction(`Se registrará el gasto “${concepto}” por ${Utils.formatMoney(monto)}. ¿Confirmar?`, async () => {
      const r = await Store.addExpense({ concepto, categoria, monto });
      if (r?.ok === false) { Toast.show(r.error || 'No se pudo registrar el gasto','error'); return r; }
      Modal.close(); Toast.show('Gasto registrado'); Router.go('gastos');
      return r;
    }, {title:'Confirmar gasto', confirmText:'Registrar gasto', danger:false, key:'gasto'});
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
        <div class="pc-img">${p.imagen || '📦'}</div>
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
    const u = Auth.currentUser();
    const hoy = Store.today();
    const cajaAbierta = Store.state.cashSessions.find(c => c.usuarioId === u.id && c.estado === 'Abierta' && c.fecha === hoy);
    if (!cajaAbierta) {
      Modal.open(`
        <div class="modal-header"><h2>⚠️ Caja cerrada</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
        <div class="modal-body"><p style="font-size:1rem;line-height:1.6">Antes de registrar una venta debes <strong>abrir la caja del día</strong>.</p><p style="color:var(--text-secondary)">Ve a <strong>Caja</strong>, ingresa el monto inicial en efectivo y pulsa <strong>Abrir caja</strong>.</p></div>
        <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button><button class="btn btn-primary" onclick="Modal.close();Router.go('caja')">Ir a Caja</button></div>`);
      return;
    }
    Modal.open(`
      <div class="modal-header">
        <h2>Confirmar pago</h2>
        <button class="btn-icon" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <p style="text-align:center;margin-bottom:0.5rem;color:var(--text-secondary)">Total a cobrar</p>
        <p style="text-align:center;font-family:var(--font-serif);font-size:2rem;color:var(--amber);margin-bottom:1.25rem">${Utils.formatMoney(total)}</p>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.5rem">Método de pago</p>
        <div class="pay-methods">
          <div class="pay-method selected" data-method="Efectivo" onclick="Pages.selectPayMethod(this)">
            <span class="pm-icon">💵</span>
            <span class="pm-label">Efectivo</span>
          </div>
          <div class="pay-method" data-method="Yape" onclick="Pages.selectPayMethod(this)">
            <span class="pm-icon">📱</span>
            <span class="pm-label">Yape</span>
          </div>
          <div class="pay-method" data-method="Plin" onclick="Pages.selectPayMethod(this)">
            <span class="pm-icon">📲</span>
            <span class="pm-label">Plin</span>
          </div>
          <div class="pay-method" data-method="Tarjeta" onclick="Pages.selectPayMethod(this)">
            <span class="pm-icon">💳</span>
            <span class="pm-label">Tarjeta</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
        <button class="btn btn-amber" id="btn-confirm-pay" onclick="Pages.confirmPago()">Confirmar pago</button>
      </div>
    `);
  },
  selectPayMethod(el) {
    document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
  },
  confirmPago() {
    const selected=document.querySelector('.pay-method.selected'); const method=selected?.getAttribute('data-method')||'Efectivo'; const total=Store.getCartTotal();
    confirmAction(`Cobrar ${Utils.formatMoney(total)} mediante ${method}. ¿Confirmar venta?`, async()=>Pages._confirmPagoNow(method), {title:'Confirmar venta',confirmText:'Cobrar',danger:false,key:'venta'});
  },
  async _confirmPagoNow(method) {
    const res = await Store.confirmSale(method);
    if (!res.ok) { Toast.show(res.error, 'error'); return res; }
    Modal.close();
    App.updateCartBadge();
    // Show success
    const s = res.sale;
    Modal.open(`
      <div class="modal-body">
        <div class="sale-success">
          <div class="ss-icon">✅</div>
          <h2>¡Venta registrada!</h2>
          <p class="ss-meta">N° ${s.numero || s.id}</p>
          <div class="ss-total">Venta guardada correctamente</div>
          <p class="ss-meta">Método: ${s.metodoPago}</p>
          <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem">
            <button class="btn btn-primary" onclick="Modal.close();Router.go('ventas')">Nueva venta</button>
            <button class="btn btn-secondary" onclick="Modal.close();Router.go('historial')">Ver historial</button>
          </div>
        </div>
      </div>
    `);
    return res;
  },

  // ---------- HISTORIAL VENTAS ----------
  historial() {
    const user = Auth.currentUser();
    let sales = [...Store.state.sales];
    if (Auth.isEmployee()) {
      sales = sales.filter(s => s.empleadoId === user.id);
    }
    sales.sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    const total = sales.filter(x=>x.estado!=='Anulada').reduce((sum,x)=>sum+Number(x.total||0),0);

    return `
      <div class="page-header">
        <div><h1 class="page-title">${Auth.isAdmin() ? 'Historial de ventas' : 'Mis ventas'}</h1><p class="ux-page-sub">Carga optimizada: ${Auth.isAdmin()?'últimos 31 días (máx. 250)':'últimos 14 días'}. Si eliges otra fecha se consulta solo ese día.</p></div>
      </div>
      <div class="stat-cards" style="margin-bottom:1.25rem">
        <div class="stat-card">
          <div class="stat-label">${Auth.isAdmin() ? 'Total de ventas' : 'Mis ventas (total)'}</div>
          <div class="stat-value amber" id="hist-total">${Utils.formatMoney(total)}</div>
          <div class="stat-sub" id="hist-count">${sales.length} registro(s)</div>
        </div>
      </div>
      <div class="toolbar">
        <input type="search" class="search-input" id="hist-search" placeholder="Buscar..." oninput="Pages.filterHistorial()" />
        <select class="filter-select" id="hist-method" onchange="Pages.filterHistorial()">
          <option value="">Todos los métodos</option>
          <option value="Efectivo">Efectivo</option>
          <option value="Yape">Yape</option>
          <option value="Plin">Plin</option>
          <option value="Tarjeta">Tarjeta</option>
        </select>
        <input type="date" id="hist-date" class="filter-select" onchange="Pages.filterHistorial(true)" />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Fecha</th><th>Hora</th><th>Empleado</th><th>Productos</th><th>Total</th><th>Método</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody id="hist-tbody">
            ${this._histRows(sales)}
          </tbody>
        </table>
      </div>
    `;
  },
  _histRows(sales) {
    if (!sales.length) return `<tr><td colspan="8">${Components.empty('🧾', 'Todavía no hay ventas registradas')}</td></tr>`;
    return sales.map(s => {
      const emp = Store.getUser(s.empleadoId);
      const prodSummary = s.items.map(i => {
        const p = Store.getProduct(i.productoId);
        return `${p?.nombre || '?'} ×${i.cantidad}`;
      }).join(', ');
      return `<tr data-method="${Utils.escapeHtml(String(s.metodoPago || ''))}" data-date="${s.fecha}" data-total="${Number(s.total || 0)}" data-search="${((emp?.nombres || '') + ' ' + prodSummary).toLowerCase()}">
        <td data-label="Fecha">${Utils.formatDate(s.fecha)}</td>
        <td data-label="Hora">${String(s.hora||'—').slice(0,5)}</td>
        <td data-label="Empleado">${Utils.escapeHtml(emp ? emp.nombres + ' ' + emp.apellidos : (s.empleadoNombre || '—'))}</td>
        <td data-label="Productos" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${Utils.escapeHtml(prodSummary)}">${Utils.escapeHtml(prodSummary)}</td>
        <td data-label="Total" style="color:var(--amber);font-weight:600">${Utils.formatMoney(s.total)}</td>
        <td data-label="Método">${Utils.escapeHtml(s.metodoPago||'—')}</td>
        <td data-label="Estado">${s.estado==='Anulada'?'<span class="badge badge-danger">Anulada</span>':'<span class="badge badge-success">Completada</span>'}</td>
        <td data-label="Acciones"><button class="btn btn-sm btn-secondary" onclick="Pages.showSaleDetail('${s.id}')">Ver</button> ${Auth.isAdmin() && s.estado !== 'Anulada' ? `<button class="btn btn-sm btn-danger" onclick="Pages.anularVenta('${s.id}')">Anular</button>` : ''}</td>
      </tr>`;
    }).join('');
  },
  async filterHistorial(loadDate = false) {
    // Filtrar desde los datos, no ocultando filas. Así funciona igual en tabla desktop
    // y en las tarjetas responsive de móvil/tablet.
    const method = (document.getElementById('hist-method')?.value || '').trim().toLowerCase();
    const date = document.getElementById('hist-date')?.value || '';
    if (loadDate && date && Store.loadSalesForDate) await Store.loadSalesForDate(date);
    const q = (document.getElementById('hist-search')?.value || '').trim().toLowerCase();
    const user = Auth.currentUser();
    let sales = [...Store.state.sales];
    if (Auth.isEmployee()) sales = sales.filter(s => s.empleadoId === user.id);

    sales = sales.filter(s => {
      const saleMethod = String(s.metodoPago || '').trim().toLowerCase();
      const saleDate = String(s.fecha || '').trim();
      const emp = Store.getUser(s.empleadoId);
      const products = (s.items || []).map(i => Store.getProduct(i.productoId)?.nombre || '').join(' ');
      const haystack = `${s.numero || s.id || ''} ${emp?.nombres || s.empleadoNombre || ''} ${emp?.apellidos || ''} ${products} ${s.metodoPago || ''}`.toLowerCase();
      return (!method || saleMethod === method) && (!date || saleDate === date) && (!q || haystack.includes(q));
    });
    sales.sort((a,b) => (`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));

    const tbody = document.getElementById('hist-tbody');
    if (tbody) {
      tbody.innerHTML = this._histRows(sales);
      App.makeTablesMobileFriendly(tbody.closest('.table-wrap') || tbody.closest('.table-responsive') || document);
      this._paginateRows('historial','hist-tbody',1);
    }
    const total = sales.filter(s=>s.estado!=='Anulada').reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalEl = document.getElementById('hist-total'), countEl = document.getElementById('hist-count');
    if (totalEl) totalEl.textContent = Utils.formatMoney(total);
    if (countEl) countEl.textContent = `${sales.length} registro(s)`;
  },
  showSaleDetail(id) {
    const s = Store.state.sales.find(x => x.id === id);
    if (!s) return;
    const emp = Store.getUser(s.empleadoId);
    Modal.open(`
      <div class="modal-header">
        <h2>Detalle de venta ${s.id}</h2>
        <button class="btn-icon" onclick="Modal.close()">✕</button>
      </div>
      <div class="modal-body">
        <div class="detail-row"><span class="dr-label">Fecha</span><span class="dr-value">${Utils.formatDate(s.fecha)} ${s.hora}</span></div>
        <div class="detail-row"><span class="dr-label">Empleado</span><span class="dr-value">${Utils.escapeHtml(emp ? emp.nombres + ' ' + emp.apellidos : (s.empleadoNombre || '—'))}</span></div>
        <div class="detail-row"><span class="dr-label">Método de pago</span><span class="dr-value">${s.metodoPago}</span></div>
        <h4 style="margin:1.25rem 0 0.75rem;font-size:0.95rem">Productos</h4>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Producto</th><th>Cant.</th><th>P. unit.</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${s.items.map(i => {
                const p = Store.getProduct(i.productoId);
                return `<tr>
                  <td data-label="Producto">${Utils.escapeHtml(p?.nombre || '—')}</td>
                  <td>${i.cantidad}</td>
                  <td>${Utils.formatMoney(i.precioUnitario)}</td>
                  <td style="color:var(--amber)">${Utils.formatMoney(i.subtotal)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="text-align:right;margin-top:1rem;font-family:var(--font-serif);font-size:1.3rem;color:var(--amber)">
          Total: ${Utils.formatMoney(s.total)}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modal.close()">Cerrar</button>
      </div>
    `);
  },

  // ---------- PRODUCTOS DISPONIBLES (empleado) ----------
  productosDisponibles() {
    const products = Store.state.products.filter(p => p.estado === 'Activo');
    return `
      <div class="page-header">
        <h1 class="page-title">Productos disponibles</h1>
      </div>
      <div class="toolbar">
        <input type="search" class="search-input" id="pd-search" placeholder="Buscar..." oninput="Pages.filterPD()" style="max-width:100%" />
      </div>
      <div class="product-grid" id="pd-grid">
        ${products.map(p => `
          <div class="product-card" style="cursor:default">
            <div class="pc-img">${p.imagen || '📦'}</div>
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
          <div class="pc-img">${p.imagen || '📦'}</div>
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
    const abierta=Store.state.cashSessions.find(c=>c.usuarioId===u.id&&c.estado==='Abierta');
    const hoy=Store.today(), fechaCaja=abierta?.fecha||hoy;
    const ventasHoy=Store.state.sales.filter(s=>s.empleadoId===u.id&&s.fecha===fechaCaja&&s.estado!=='Anulada');
    const sum=m=>ventasHoy.filter(s=>(s.metodoPago||'')===m).reduce((a,b)=>a+Number(b.total||0),0);
    const efectivo=sum('Efectivo'),yape=sum('Yape'),plin=sum('Plin'),tarjeta=sum('Tarjeta'),totalDia=efectivo+yape+plin+tarjeta;
    const esperado=Number(abierta?.montoInicial||0)+efectivo;
    const hist=[...Store.state.cashSessions].filter(c=>Auth.isAdmin()||c.usuarioId===u.id).sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));
    const cajaAnterior=abierta&&abierta.fecha!==hoy;
    const metricasCaja=(c)=>{
      const sales=Store.state.sales.filter(s=>s.cajaId===c.id&&s.estado!=='Anulada');
      const by=m=>sales.filter(s=>String(s.metodoPago||'')===m).reduce((a,b)=>a+Number(b.total||0),0);
      const calc={efectivo:by('Efectivo'),yape:by('Yape'),plin:by('Plin'),tarjeta:by('Tarjeta')};
      calc.total=calc.efectivo+calc.yape+calc.plin+calc.tarjeta;
      return {
        total:c.totalVentasDia==null?calc.total:Number(c.totalVentasDia||0),
        efectivo:c.efectivoVentas==null?calc.efectivo:Number(c.efectivoVentas||0),
        yape:c.yapeVentas==null?calc.yape:Number(c.yapeVentas||0),
        plin:c.plinVentas==null?calc.plin:Number(c.plinVentas||0),
        tarjeta:c.tarjetaVentas==null?calc.tarjeta:Number(c.tarjetaVentas||0)
      };
    };
    const historyRows=hist.map(c=>{
      const m=metricasCaja(c), isOpen=c.estado==='Abierta', diff=c.diferencia==null?null:Number(c.diferencia||0);
      const status=isOpen?'<span class="badge badge-success">● Abierta</span>':'<span class="badge badge-neutral">Cerrada</span>';
      const diffHtml=isOpen?'<span class="badge badge-warning">Pendiente</span>':Math.abs(diff||0)<0.005?'<span class="badge badge-success">S/ 0.00</span>':`<span class="badge ${diff<0?'badge-danger':'badge-warning'}">${diff>0?'+':''}${Utils.formatMoney(diff)}</span>`;
      return `<tr class="${isOpen?'ux-cash-row-open':''}">
        <td data-label="Apertura"><div class="ux-cash-date"><strong>${Utils.formatDate(c.fecha)}</strong><small>${String(c.hora||'').slice(0,5)||'—'}</small></div></td>
        <td data-label="Usuario"><strong>${Utils.escapeHtml(c.usuarioNombre||'—')}</strong></td>
        <td data-label="Ventas"><strong class="ux-money-cell">${Utils.formatMoney(m.total)}</strong></td>
        <td data-label="Efectivo">${Utils.formatMoney(m.efectivo)}</td>
        <td data-label="Yape / Plin"><div class="ux-split-payment"><span>Yape <strong>${Utils.formatMoney(m.yape)}</strong></span><span>Plin <strong>${Utils.formatMoney(m.plin)}</strong></span></div></td>
        <td data-label="Tarjeta">${Utils.formatMoney(m.tarjeta)}</td>
        <td data-label="Estado">${status}</td>
        <td data-label="Diferencia">${diffHtml}</td>
      </tr>`;
    }).join('')||'<tr><td colspan="8">Sin registros de caja</td></tr>';
    return `<div class="page-header ux-page-head"><div><h1 class="page-title">Caja</h1><p class="ux-page-sub">Apertura, ventas y cierre de turno</p></div></div>
      ${cajaAnterior?`<div class="alert alert-warning"><strong>⚠️ Caja pendiente del ${Utils.formatDate(abierta.fecha)}</strong><br>Ciérrala antes de registrar ventas de hoy.</div>`:''}
      <div class="ux-cash-hero ${abierta?'is-open':'is-closed'}"><div class="ux-cash-state"><span class="ux-status-dot"></span><div><small>ESTADO ACTUAL</small><h2>${abierta?'CAJA ABIERTA':'CAJA CERRADA'}</h2><p>${abierta?`Apertura ${String(abierta.hora||'').slice(0,5)} · Inicial ${Utils.formatMoney(abierta.montoInicial||0)}`:'Abre una caja para comenzar a vender'}</p></div></div></div>
      <div class="stat-cards ux-payment-summary"><div class="stat-card"><div class="stat-label">Total vendido</div><div class="stat-value amber">${Utils.formatMoney(totalDia)}</div><div class="stat-sub">${ventasHoy.length} venta(s)</div></div><div class="stat-card"><div class="stat-label">Efectivo</div><div class="stat-value">${Utils.formatMoney(efectivo)}</div><div class="stat-sub">En caja: ${Utils.formatMoney(esperado)}</div></div><div class="stat-card"><div class="stat-label">Yape / Plin</div><div class="stat-value">${Utils.formatMoney(yape+plin)}</div><div class="stat-sub">${Utils.formatMoney(yape)} / ${Utils.formatMoney(plin)}</div></div><div class="stat-card"><div class="stat-label">Tarjeta</div><div class="stat-value">${Utils.formatMoney(tarjeta)}</div><div class="stat-sub">Pagos electrónicos</div></div></div>
      <div class="ux-cash-layout">
        <div class="card ux-cash-action"><h3>${abierta?'Cerrar caja':'Abrir caja'}</h3>${abierta?`<div class="ux-money-row"><span>Efectivo esperado</span><strong>${Utils.formatMoney(esperado)}</strong></div><label class="form-label">Efectivo real contado</label><input id="cash-real" class="form-control" type="number" min="0" step="0.01" value="${esperado.toFixed(2)}"><p class="ux-help">Cuenta solo el dinero físico disponible en caja.</p><button id="btn-close-cash" class="btn btn-danger btn-full" onclick="Pages.closeCash()">Cerrar caja</button>`:`<label class="form-label">Monto inicial en efectivo</label><input id="cash-initial" class="form-control" type="number" min="0" step="0.01" value="0"><p class="ux-help">Dinero disponible antes de realizar la primera venta.</p><button id="btn-open-cash" class="btn btn-primary btn-full" onclick="Pages.openCash()">Abrir caja y comenzar</button>`}</div>
        <div class="card ux-cash-history-card">
          <div class="ux-section-head ux-cash-history-head"><div><h3>Historial de caja</h3><p>Sesiones, medios de pago y diferencias</p></div><span class="ux-history-count">${hist.length} sesión${hist.length===1?'':'es'}</span></div>
          <div class="table-wrap ux-cash-history"><table><thead><tr><th>Apertura</th><th>Usuario</th><th>Ventas</th><th>Efectivo</th><th>Yape / Plin</th><th>Tarjeta</th><th>Estado</th><th>Diferencia</th></tr></thead><tbody id="cash-tbody">${historyRows}</tbody></table></div>
        </div>
      </div>`;
  },
  openCash(){const v=Number(document.getElementById('cash-initial')?.value);if(!Number.isFinite(v)||v<0)return Toast.show('Ingresa un monto inicial válido','error');confirmAction(`Abrir caja con ${Utils.formatMoney(v)} de efectivo inicial. ¿Confirmar?`,async()=>{const r=await Store.openCash(v);Toast.show(r.ok?'Caja abierta':r.error,r.ok?'success':'error');if(r.ok){Modal.close();Router.go('caja')}return r;},{title:'Confirmar apertura de caja',confirmText:'Abrir caja',danger:false,key:'open-cash'});},
  closeCash(){const v=Number(document.getElementById('cash-real')?.value);if(!Number.isFinite(v)||v<0)return Toast.show('Ingresa un efectivo real válido','error');confirmAction(`Cerrar la caja declarando ${Utils.formatMoney(v)} de efectivo contado. Esta acción finalizará la sesión de caja.`,async()=>{const r=await Store.closeCash(v);Toast.show(r.ok?`Caja cerrada. Diferencia: ${Utils.formatMoney(r.diferencia)}`:r.error,r.ok?'success':'error');if(r.ok){Modal.close();Router.go('caja')}return r;},{title:'Confirmar cierre de caja',confirmText:'Cerrar caja',danger:true,key:'close-cash'});},
  reportes(){if(!Auth.requireAdmin())return '';const desde=(()=>{const d=new Date();d.setDate(d.getDate()-31);return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)})();const sales=Store.state.sales.filter(s=>s.estado!=='Anulada'&&s.fecha>=desde),ventas=sales.reduce((a,b)=>a+Number(b.total||0),0),costo=sales.reduce((a,b)=>a+Number(b.costoTotal||0),0),exp=Store.state.expenses.filter(e=>e.fecha>=desde),gastos=exp.reduce((a,b)=>a+Number(b.monto||0),0),util=ventas-costo-gastos;const by={};sales.forEach(s=>by[s.metodoPago]=(by[s.metodoPago]||0)+Number(s.total||0));return `<div class="page-header"><div><h1 class="page-title">📈 Reportes</h1><p class="ux-page-sub">Resumen optimizado de los últimos 31 días · máximo 250 documentos por historial.</p></div></div><div class="row g-3"><div class="col-6 col-lg-3"><div class="card p-3"><small>Ventas</small><h3>${Utils.formatMoney(ventas)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>Costo vendido</small><h3>${Utils.formatMoney(costo)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>Gastos</small><h3>${Utils.formatMoney(gastos)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>Resultado estimado</small><h3>${Utils.formatMoney(util)}</h3></div></div></div><div class="card p-3 mt-3"><h5>Ventas por método</h5>${Object.entries(by).map(([k,v])=>`<div class="d-flex justify-content-between border-bottom py-2"><span>${k}</span><strong>${Utils.formatMoney(v)}</strong></div>`).join('')||'Sin ventas'}</div>`},
  async anularVenta(id){const motivo=prompt('Motivo de anulación:')?.trim();if(!motivo)return;confirmAction('La venta será anulada y el stock será devuelto. Esta acción no debe repetirse. ¿Confirmar?',async()=>{const r=await Store.cancelSale(id,motivo);Toast.show(r.ok?'Venta anulada':r.error,r.ok?'success':'error');if(r.ok){Modal.close();Router.go('historial')}return r;},{title:'Anular venta',confirmText:'Anular venta',danger:true,key:'cancel-sale:'+id})}
,
  configuracion() {
    if (!Auth.requireAdmin()) return '';
    const u = Auth.currentUser() || {}, m = Store.getUsageStats ? Store.getUsageStats() : {reads:0,writes:0,deletes:0,knownBytes:0,knownDocs:0,limits:{reads:50000,writes:20000,deletes:20000,storageBytes:1073741824}};
    const pct=(v,max)=>Math.min(100,Math.max(0,(Number(v||0)/max)*100));
    const fmtBytes=(n)=>{n=Number(n||0);if(n<1024)return `${n} B`;if(n<1048576)return `${(n/1024).toFixed(1)} KB`;if(n<1073741824)return `${(n/1048576).toFixed(2)} MB`;return `${(n/1073741824).toFixed(3)} GB`;};
    const readPct=pct(m.reads,m.limits.reads), writePct=pct(m.writes,m.limits.writes), deletePct=pct(m.deletes,m.limits.deletes), storagePct=pct(m.knownBytes,m.limits.storageBytes);
    const meter=(label,value,max,p,sub)=>`<div class="ux-usage-item"><div class="ux-usage-top"><span>${label}</span><strong>${value.toLocaleString('es-PE')} / ${max.toLocaleString('es-PE')}</strong></div><div class="ux-meter"><span style="width:${p.toFixed(2)}%"></span></div><small>${p.toFixed(2)}% · ${sub}</small></div>`;
    return `<div class="page-header"><div><h1 class="page-title">⚙️ Configuración</h1><p class="ux-page-sub">Estado del sistema y consumo preventivo de Firebase.</p></div></div>
      <div class="ux-usage-grid">
        <div class="card ux-usage-card">
          <div class="ux-section-head"><div><h3>🔥 Uso de Firestore hoy</h3><p>Estimación registrada por este navegador/PWA.</p></div><span class="badge badge-success">Optimización activa</span></div>
          ${meter('Lecturas estimadas',m.reads,m.limits.reads,readPct,'cuota gratuita diaria de Firestore Standard')}
          ${meter('Escrituras estimadas',m.writes,m.limits.writes,writePct,'cuota gratuita diaria')}
          ${meter('Eliminaciones estimadas',m.deletes,m.limits.deletes,deletePct,'cuota gratuita diaria')}
          <div class="ux-usage-note">ℹ️ Firebase no entrega al navegador el contador facturado global de todos los dispositivos. Este panel cuenta las operaciones realizadas por esta instalación. Para el valor oficial usa el panel de Firebase.</div>
          <a class="btn btn-secondary" target="_blank" rel="noopener" href="https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/-default-/usage">Abrir consumo oficial de Firebase ↗</a>
        </div>
        <div class="card ux-usage-card">
          <div class="ux-section-head"><div><h3>💾 Almacenamiento Firestore</h3><p>Cuota total gratuita y datos conocidos por la app.</p></div></div>
          <div class="ux-storage-number"><strong>${fmtBytes(m.knownBytes)}</strong><span>de 1 GB gratuito</span></div>
          <div class="ux-meter ux-meter-storage"><span style="width:${storagePct.toFixed(4)}%"></span></div>
          <div class="ux-storage-meta"><span>${m.knownDocs} documentos cargados</span><span>${storagePct.toFixed(4)}% mínimo conocido</span></div><div class="ux-storage-meta"><span>Datos leídos hoy por esta instalación</span><strong>${fmtBytes(m.bytesRead||0)}</strong></div>
          <div class="ux-usage-note">El tamaño mostrado es una <strong>estimación mínima</strong> de los documentos que esta app ya conoce. El almacenamiento real de Firestore también incluye índices, metadatos y documentos históricos no descargados. El total oficial se consulta en Firebase/Google Cloud.</div>
        </div>
      </div>
      <div class="row g-3 mt-1">
        <div class="col-12 col-lg-6"><div class="card p-3">
          <h5>Proyecto X Bar</h5><p class="text-muted mb-3">Información general del sistema.</p>
          <div class="mb-2"><strong>Administrador:</strong> ${Utils.escapeHtml(u.nombre || u.nombres || 'Administrador')}</div>
          <div class="mb-2"><strong>Correo:</strong> ${Utils.escapeHtml(u.email || '')}</div>
          <div class="mb-2"><strong>Base de datos:</strong> Firebase / Firestore</div>
          <div><strong>Proyecto:</strong> ${Utils.escapeHtml(firebaseConfig.projectId || '')}</div>
        </div></div>
        <div class="col-12 col-lg-6"><div class="card p-3">
          <h5>⚡ Optimización aplicada</h5>
          <div class="ux-opt-list"><span>✓ Productos en tiempo real</span><span>✓ Ventas solo del día en tiempo real</span><span>✓ Historiales bajo demanda</span><span>✓ Máximo 250 registros por consulta histórica</span><span>✓ Caché persistente en el dispositivo</span><span>✓ Cierre de caja reutiliza ventas ya cargadas</span><span>✓ Validación de caja reutilizada durante la sesión</span></div>
          <p class="text-muted mt-3 mb-0">La configuración sensible permanece en <code>firebase-config.js</code>.</p>
        </div></div>
      </div>`;
  }
};
