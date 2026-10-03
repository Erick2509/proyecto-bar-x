/* ===== ALL PAGES / VIEWS ===== */
const Pages = {
  // ---------- DASHBOARD ADMIN ----------
  dashboardAdmin() {
    const salesToday = Store.salesToday();
    const totalToday = salesToday.reduce((s, x) => s + x.total, 0);
    const allSales = Store.state.sales;
    const totalAll = Store.totalSales();
    const expToday = Store.expensesToday();
    const totalExpToday = expToday.reduce((s, x) => s + x.monto, 0);
    const low = Store.lowStockProducts();

    const recent = [...allSales].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).slice(0, 6);

    return `
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
      </div>
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-label">Ventas de hoy</div>
          <div class="stat-value amber">${Utils.formatMoney(totalToday)}</div>
          <div class="stat-sub">${salesToday.length} venta(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ventas registradas</div>
          <div class="stat-value">${allSales.length}</div>
          <div class="stat-sub">Total: ${Utils.formatMoney(totalAll)}</div>
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
                      <td>${Utils.formatDate(s.fecha)} ${s.hora.slice(0,5)}</td>
                      <td>${Utils.escapeHtml(emp ? emp.nombres : '—')}</td>
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
    const mySales = Store.state.sales.filter(s => s.empleadoId === user.id);
    const today = Utils.todayISO();
    const myToday = mySales.filter(s => s.fecha === today);
    const totalToday = myToday.reduce((s, x) => s + x.total, 0);
    const totalAll = mySales.reduce((s, x) => s + x.total, 0);
    const itemsSold = mySales.reduce((s, sale) => s + sale.items.reduce((a, i) => a + i.cantidad, 0), 0);
    const low = Store.lowStockProducts();

    return `
      <div class="page-header">
        <h1 class="page-title">Hola, ${Utils.escapeHtml(user.nombres)}</h1>
      </div>
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-label">Mis ventas de hoy</div>
          <div class="stat-value amber">${Utils.formatMoney(totalToday)}</div>
          <div class="stat-sub">${myToday.length} venta(s)</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ventas realizadas</div>
          <div class="stat-value">${mySales.length}</div>
          <div class="stat-sub">Total: ${Utils.formatMoney(totalAll)}</div>
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
    const users = Store.state.users.filter(u => u.role === 'empleado' || true); // show all
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
        <td>${Utils.escapeHtml(u.nombres)}</td>
        <td>${Utils.escapeHtml(u.apellidos)}</td>
        <td>${Utils.escapeHtml(u.email)}</td>
        <td>${Utils.escapeHtml(u.telefono || '—')}</td>
        <td>${u.estado === 'Activo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
        <td class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="Pages.openEmpleadoForm('${u.id}')">Editar</button>
          ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="Pages.deleteEmpleado('${u.id}')">Eliminar</button>` : ''}
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
          ${u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="Pages.deleteEmpleado('${u.id}')">Eliminar</button>` : ''}
        </div>
      </div>
    `).join('');
  },
  filterEmpleados() {
    const q = (document.getElementById('emp-search')?.value || '').toLowerCase();
    document.querySelectorAll('#emp-tbody tr, #emp-cards .card').forEach(el => {
      const s = el.getAttribute('data-search') || '';
      el.style.display = s.includes(q) ? '' : 'none';
    });
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
            <label>Correo *</label>
            <input type="email" name="email" required value="${Utils.escapeHtml(u?.email || '')}" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Contraseña ${isEdit ? '(dejar vacío para no cambiar)' : '*'}</label>
              <input type="password" name="password" ${isEdit ? '' : 'required'} minlength="4" />
            </div>
            <div class="form-group">
              <label>Confirmar contraseña</label>
              <input type="password" name="password2" ${isEdit ? '' : 'required'} />
            </div>
          </div>
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
    if (data.password && data.password.length < 4) {
      errEl.textContent = 'La contraseña debe tener al menos 4 caracteres';
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
  deleteEmpleado(id) {
    confirmAction('¿Desactivar este empleado?', async () => {
      const res = await Store.deleteUser(id);
      if (res.ok) {
        Toast.show('Empleado eliminado');
        Router.go('empleados');
      } else {
        Toast.show(res.error, 'error');
      }
    });
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
    const count = Store.state.products.filter(p => p.categoriaId === id).length;
    if (count > 0) {
      Toast.show(`No se puede eliminar: tiene ${count} producto(s) asociado(s)`, 'error');
      return;
    }
    confirmAction('¿Desactivar esta categoría?', async () => {
      await Store.deleteCategory(id);
      Toast.show('Categoría eliminada');
      Router.go('categorias');
    });
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
          <div class="form-row">
            <div class="form-group">
              <label>6. Imagen / ícono (emoji)</label>
              <input type="text" name="imagen" placeholder="🍺" value="${Utils.escapeHtml(p?.imagen || '📦')}" maxlength="4" />
            </div>
            <div class="form-group">
              <label>Estado</label>
              <select name="estado">
                <option value="Activo" ${!p || p.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                <option value="Inactivo" ${p?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
              </select>
            </div>
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
    const res = await Store.addMovement({ productoId, tipo:'Entrada', cantidad, costoUnitario:costo, motivo });
    if (!res.ok) return Toast.show(res.error || 'No se pudo agregar stock', 'error');
    Modal.close(); Toast.show('Stock agregado y gasto registrado', 'success'); Router.go('productos');
  },
  deleteProducto(id) {
    confirmAction('¿Desactivar este producto?', async () => {
      await Store.deleteProduct(id);
      Toast.show('Producto eliminado');
      Router.go('productos');
    });
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
    if (cantidad <= 0) {
      Toast.show('Cantidad inválida', 'error');
      return;
    }
    const res = await Store.addMovement({ productoId, tipo, cantidad, costoUnitario: costo, motivo: document.getElementById('mov-motivo')?.value || '' });
    if (!res.ok) {
      Toast.show(res.error, 'error');
      return;
    }
    Modal.close();
    Toast.show('Movimiento registrado' + (tipo === 'Entrada' && costo ? ' · Gasto generado' : ''));
    Router.go('productos');
  },

  // ---------- MOVIMIENTOS ----------
  movimientos() {
    if (!Auth.requireAdmin()) return '';
    const movs = [...Store.state.movements].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    return `
      <div class="page-header">
        <h1 class="page-title">Movimientos de stock</h1>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Fecha</th><th>Hora</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock ant.</th><th>Stock nuevo</th><th>Usuario</th></tr>
          </thead>
          <tbody>
            ${movs.length === 0 ? `<tr><td colspan="8">${Components.empty('📋', 'No hay movimientos')}</td></tr>` :
              movs.map(m => {
                const p = Store.getProduct(m.productoId);
                const u = Store.getUser(m.usuarioId);
                const tipoBadge = m.tipo === 'Venta' ? 'badge-accent' : m.tipo === 'Entrada' ? 'badge-success' : 'badge-warning';
                return `<tr>
                  <td>${Utils.formatDate(m.fecha)}</td>
                  <td>${m.hora.slice(0,5)}</td>
                  <td>${Utils.escapeHtml(p?.nombre || '—')}</td>
                  <td><span class="badge ${tipoBadge}">${m.tipo}</span></td>
                  <td>${m.cantidad}</td>
                  <td>${m.stockAnterior}</td>
                  <td><strong>${m.stockNuevo}</strong></td>
                  <td>${Utils.escapeHtml(u ? u.nombres : '—')}</td>
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
          <div class="stat-label">Total de gastos</div>
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
        <td>${Utils.formatDate(e.fecha)}</td>
        <td>${e.hora.slice(0,5)}</td>
        <td>${Utils.escapeHtml(e.concepto)}</td>
        <td><span class="badge badge-neutral">${Utils.escapeHtml(e.categoria)}</span></td>
        <td style="color:var(--amber);font-weight:600">${Utils.formatMoney(e.monto)}</td>
        <td>${e.origen === 'Manual' ? '<span class="badge badge-accent">Manual</span>' : '<span class="badge badge-success">Compra de stock</span>'}</td>
        <td>${Utils.escapeHtml(u ? u.nombres : '—')}</td>
      </tr>`;
    }).join('');
  },
  filterGastos() {
    const q = (document.getElementById('gasto-search')?.value || '').toLowerCase();
    const cat = document.getElementById('gasto-cat-filter')?.value || '';
    document.querySelectorAll('#gasto-tbody tr').forEach(tr => {
      const concept = tr.getAttribute('data-concept') || '';
      const c = tr.getAttribute('data-cat') || '';
      const match = (!q || concept.includes(q)) && (!cat || c === cat);
      tr.style.display = match ? '' : 'none';
    });
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
    await Store.addExpense({ concepto, categoria, monto });
    Modal.close();
    Toast.show('Gasto registrado');
    Router.go('gastos');
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
          <button class="btn btn-amber btn-full" style="margin-top:1rem;padding:0.9rem;font-size:1.05rem" 
            ${cart.length === 0 ? 'disabled' : ''} onclick="Pages.openPago()">
            Pagar ${cart.length ? Utils.formatMoney(total) : ''}
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
  async confirmPago() {
    const selected = document.querySelector('.pay-method.selected');
    const method = selected?.getAttribute('data-method') || 'Efectivo';
    const res = await Store.confirmSale(method);
    if (!res.ok) {
      Toast.show(res.error, 'error');
      return;
    }
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
  },

  // ---------- HISTORIAL VENTAS ----------
  historial() {
    const user = Auth.currentUser();
    let sales = [...Store.state.sales];
    if (Auth.isEmployee()) {
      sales = sales.filter(s => s.empleadoId === user.id);
    }
    sales.sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    const total = sales.reduce((s, x) => s + x.total, 0);

    return `
      <div class="page-header">
        <h1 class="page-title">${Auth.isAdmin() ? 'Historial de ventas' : 'Mis ventas'}</h1>
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
        <input type="date" id="hist-date" class="filter-select" onchange="Pages.filterHistorial()" />
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Fecha</th><th>Hora</th><th>Empleado</th><th>Productos</th><th>Total</th><th>Método</th><th></th></tr>
          </thead>
          <tbody id="hist-tbody">
            ${this._histRows(sales)}
          </tbody>
        </table>
      </div>
    `;
  },
  _histRows(sales) {
    if (!sales.length) return `<tr><td colspan="7">${Components.empty('🧾', 'Todavía no hay ventas registradas')}</td></tr>`;
    return sales.map(s => {
      const emp = Store.getUser(s.empleadoId);
      const prodSummary = s.items.map(i => {
        const p = Store.getProduct(i.productoId);
        return `${p?.nombre || '?'} ×${i.cantidad}`;
      }).join(', ');
      return `<tr data-method="${Utils.escapeHtml(String(s.metodoPago || ''))}" data-date="${s.fecha}" data-total="${Number(s.total || 0)}" data-search="${((emp?.nombres || '') + ' ' + prodSummary).toLowerCase()}">
        <td>${Utils.formatDate(s.fecha)}</td>
        <td>${s.hora.slice(0,5)}</td>
        <td>${Utils.escapeHtml(emp ? emp.nombres + ' ' + emp.apellidos : (s.empleadoNombre || '—'))}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${Utils.escapeHtml(prodSummary)}">${Utils.escapeHtml(prodSummary)}</td>
        <td style="color:var(--amber);font-weight:600">${Utils.formatMoney(s.total)}</td>
        <td>${s.metodoPago}</td>
        <td><button class="btn btn-sm btn-secondary" onclick="Pages.showSaleDetail('${s.id}')">Ver</button> ${Auth.isAdmin() && s.estado !== 'Anulada' ? `<button class="btn btn-sm btn-danger" onclick="Pages.anularVenta('${s.id}')">Anular</button>` : ''}</td>
      </tr>`;
    }).join('');
  },
  filterHistorial() {
    const method = (document.getElementById('hist-method')?.value || '').trim().toLowerCase();
    const date = document.getElementById('hist-date')?.value || '';
    const q = (document.getElementById('hist-search')?.value || '').trim().toLowerCase();
    let count = 0, total = 0;
    document.querySelectorAll('#hist-tbody tr[data-method]').forEach(tr => {
      const m = (tr.dataset.method || '').trim().toLowerCase();
      const d = (tr.dataset.date || '').trim();
      const text = (tr.dataset.search || '').toLowerCase();
      const match = (!method || m === method) && (!date || d === date) && (!q || text.includes(q));
      tr.style.display = match ? '' : 'none';
      if (match) { count++; total += Number(tr.dataset.total || 0); }
    });
    const totalEl = document.getElementById('hist-total'), countEl = document.getElementById('hist-count');
    if (totalEl) totalEl.textContent = Utils.formatMoney(total);
    if (countEl) countEl.textContent = `${count} registro(s)`;
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
                  <td>${Utils.escapeHtml(p?.nombre || '—')}</td>
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
    const hoy=Store.today();
    const ventasHoy=Store.state.sales.filter(s=>s.empleadoId===u.id&&s.fecha===hoy&&s.estado!=='Anulada');
    const sum=m=>ventasHoy.filter(s=>(s.metodoPago||'')===m).reduce((a,b)=>a+Number(b.total||0),0);
    const efectivo=sum('Efectivo'), yape=sum('Yape'), plin=sum('Plin'), tarjeta=sum('Tarjeta');
    const totalDia=efectivo+yape+plin+tarjeta;
    const esperado=Number(abierta?.montoInicial||0)+efectivo;
    const hist=[...Store.state.cashSessions].filter(c=>Auth.isAdmin()||c.usuarioId===u.id).sort((a,b)=>(`${b.fecha||''}${b.hora||''}`).localeCompare(`${a.fecha||''}${a.hora||''}`));
    return `<div class="page-header"><h1 class="page-title">💰 ${Auth.isAdmin()?'Caja':'Mi caja'}</h1></div>
      <div class="stat-cards mb-3">
        <div class="stat-card"><div class="stat-label">Ventas totales de hoy</div><div class="stat-value amber">${Utils.formatMoney(totalDia)}</div><div class="stat-sub">${ventasHoy.length} venta(s)</div></div>
        <div class="stat-card"><div class="stat-label">Efectivo</div><div class="stat-value">${Utils.formatMoney(efectivo)}</div><div class="stat-sub">Esperado en caja: ${Utils.formatMoney(esperado)}</div></div>
        <div class="stat-card"><div class="stat-label">Yape + Plin</div><div class="stat-value">${Utils.formatMoney(yape+plin)}</div><div class="stat-sub">Yape ${Utils.formatMoney(yape)} · Plin ${Utils.formatMoney(plin)}</div></div>
        <div class="stat-card"><div class="stat-label">Tarjeta</div><div class="stat-value">${Utils.formatMoney(tarjeta)}</div><div class="stat-sub">Ventas del día</div></div>
      </div>
      <div class="row g-3"><div class="col-12 col-lg-5"><div class="card p-3"><h5>${abierta?'Cerrar caja':'Abrir caja'}</h5>${abierta?`<p>Total vendido hoy: <strong>${Utils.formatMoney(totalDia)}</strong></p><p>Efectivo esperado (inicial + ventas en efectivo): <strong>${Utils.formatMoney(esperado)}</strong></p><label class="form-label">Efectivo real contado</label><input id="cash-real" class="form-control mb-2" type="number" min="0" step="0.01" value="${esperado.toFixed(2)}"><button class="btn btn-primary" onclick="Pages.closeCash()">Cerrar caja del día</button>`:`<label class="form-label">Monto inicial en efectivo</label><input id="cash-initial" class="form-control mb-2" type="number" min="0" step="0.01" value="0"><button class="btn btn-primary" onclick="Pages.openCash()">Abrir caja</button>`}</div></div>
      <div class="col-12 col-lg-7"><div class="card p-3"><h5>Historial de cierres</h5><div class="table-responsive"><table class="table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Ventas del día</th><th>Efectivo</th><th>Yape</th><th>Plin</th><th>Tarjeta</th><th>Estado</th><th>Diferencia</th></tr></thead><tbody>${hist.map(c=>`<tr><td>${c.fecha} ${c.hora?.slice(0,5)||''}</td><td>${Utils.escapeHtml(c.usuarioNombre||'')}</td><td>${c.totalVentasDia==null?'—':Utils.formatMoney(c.totalVentasDia)}</td><td>${c.efectivoVentas==null?'—':Utils.formatMoney(c.efectivoVentas)}</td><td>${c.yapeVentas==null?'—':Utils.formatMoney(c.yapeVentas)}</td><td>${c.plinVentas==null?'—':Utils.formatMoney(c.plinVentas)}</td><td>${c.tarjetaVentas==null?'—':Utils.formatMoney(c.tarjetaVentas)}</td><td>${c.estado}</td><td>${c.diferencia==null?'—':Utils.formatMoney(c.diferencia)}</td></tr>`).join('')||'<tr><td colspan="9">Sin registros</td></tr>'}</tbody></table></div></div></div></div>`;
  },
  async openCash(){const r=await Store.openCash(Number(document.getElementById('cash-initial').value)||0);Toast.show(r.ok?'Caja abierta':r.error,r.ok?'success':'error');if(r.ok)Router.go('caja')},
  async closeCash(){const r=await Store.closeCash(Number(document.getElementById('cash-real').value)||0);Toast.show(r.ok?`Caja cerrada. Diferencia: ${Utils.formatMoney(r.diferencia)}`:r.error,r.ok?'success':'error');if(r.ok)Router.go('caja')},
  reportes(){if(!Auth.requireAdmin())return '';const sales=Store.state.sales.filter(s=>s.estado!=='Anulada'),ventas=sales.reduce((a,b)=>a+Number(b.total||0),0),costo=sales.reduce((a,b)=>a+Number(b.costoTotal||0),0),gastos=Store.totalExpenses(),util=ventas-costo-gastos;const by={};sales.forEach(s=>by[s.metodoPago]=(by[s.metodoPago]||0)+s.total);return `<div class="page-header"><h1 class="page-title">📈 Reportes</h1></div><div class="row g-3"><div class="col-6 col-lg-3"><div class="card p-3"><small>Ventas</small><h3>${Utils.formatMoney(ventas)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>Costo vendido</small><h3>${Utils.formatMoney(costo)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>Gastos</small><h3>${Utils.formatMoney(gastos)}</h3></div></div><div class="col-6 col-lg-3"><div class="card p-3"><small>Resultado estimado</small><h3>${Utils.formatMoney(util)}</h3></div></div></div><div class="card p-3 mt-3"><h5>Ventas por método</h5>${Object.entries(by).map(([k,v])=>`<div class="d-flex justify-content-between border-bottom py-2"><span>${k}</span><strong>${Utils.formatMoney(v)}</strong></div>`).join('')||'Sin ventas'}</div>`},
  async anularVenta(id){const motivo=prompt('Motivo de anulación:');if(!motivo)return;const r=await Store.cancelSale(id,motivo);Toast.show(r.ok?'Venta anulada':r.error,r.ok?'success':'error');if(r.ok)Router.go('historial')}
,
  configuracion() {
    if (!Auth.requireAdmin()) return '';
    const u = Auth.currentUser() || {};
    return `<div class="page-header"><h1 class="page-title">⚙️ Configuración</h1></div>
      <div class="row g-3">
        <div class="col-12 col-lg-6"><div class="card p-3">
          <h5>Proyecto X Bar</h5><p class="text-muted mb-3">Información general del sistema.</p>
          <div class="mb-2"><strong>Administrador:</strong> ${Utils.escapeHtml(u.nombre || u.nombres || 'Administrador')}</div>
          <div class="mb-2"><strong>Correo:</strong> ${Utils.escapeHtml(u.email || '')}</div>
          <div class="mb-2"><strong>Rol:</strong> ${Utils.escapeHtml(u.role || 'admin')}</div>
          <div><strong>Base de datos:</strong> Firebase / Firestore</div>
        </div></div>
        <div class="col-12 col-lg-6"><div class="card p-3">
          <h5>Aplicación</h5><p>La configuración sensible de Firebase permanece en <code>firebase-config.js</code>.</p>
          <p class="mb-0">Los cambios administrativos del negocio se realizan desde Productos, Categorías, Empleados, Caja y Movimientos.</p>
        </div></div>
      </div>`;
  }
};
