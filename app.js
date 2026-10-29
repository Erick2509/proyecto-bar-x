/* ===== APP ROUTER & INIT ===== */
/* ===== ASISTENTE DE PUESTA EN MARCHA ===== */
const SetupGuide = {
  KEY: 'px_setup_v30',

  _read() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); }
    catch (_) { return {}; }
  },
  _write(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (_) {}
  },
  reset() {
    this._write({active:true,completed:false,cashOpened:false,saleDone:false,saleSkipped:false});
  },
  restart() {
    this._write({active:true,completed:false,cashOpened:false,saleDone:false,saleSkipped:false});
    try { App.buildNav(); } catch (_) {}
  },
  mark(flag) {
    const d = this._read();
    d.active = true;
    d.completed = false;
    d[flag] = true;
    this._write(d);
    try { App.buildNav(); } catch (_) {}
  },
  skipSale() { this.mark('saleSkipped'); },
  snapshot() {
    const d = this._read();
    const hasCategory = Store.state.categories.some(c => c.estado !== 'Inactivo');
    const hasProduct = Store.state.products.some(p => p.estado !== 'Inactivo');
    const hasStock = Store.state.products.some(p => p.estado === 'Activo' && Number(p.stock || 0) > 0);
    const hasEmployee = Store.state.users.some(u => u.role === 'empleado' && String(u.estado || '').toLowerCase() === 'activo');
    const cashOpened = !!d.cashOpened || Store.state.cashSessions.some(c => c.estado === 'Abierta');
    const saleDone = !!d.saleDone || Store.state.sales.some(v => v.estado !== 'Anulada');
    const saleReady = saleDone || !!d.saleSkipped;
    return {data:d,hasCategory,hasProduct,hasStock,hasEmployee,cashOpened,saleDone,saleSkipped:!!d.saleSkipped,saleReady,
      canFinish:hasCategory && hasProduct && hasStock && cashOpened && saleReady};
  },
  isActive() {
    if (!Auth.isAdmin()) return false;
    const d = this._read();
    if (d.completed) return false;
    if (d.active) return true;
    // No activar automáticamente en instalaciones antiguas que ya tienen catálogo.
    // Sí activarlo cuando la base está realmente vacía o acaba de reiniciarse.
    if (Store.state.categories.length === 0 && Store.state.products.length === 0) {
      this._write({...d,active:true,completed:false});
      return true;
    }
    return false;
  },
  finish() {
    const s = this.snapshot();
    if (!s.canFinish) return {ok:false,error:'Completa los pasos obligatorios antes de finalizar el tutorial'};
    this._write({...s.data,active:false,completed:true});
    try { App.buildNav(); } catch (_) {}
    return {ok:true};
  },
  isPageEnabled(page) {
    if (!Auth.isAdmin() || !this.isActive()) return true;
    const s = this.snapshot();
    if (['dashboard','configuracion','categorias'].includes(page)) return true;
    if (page === 'productos') return s.hasCategory;
    if (['movimientos','empleados'].includes(page)) return s.hasProduct;
    if (page === 'caja') return s.hasStock;
    if (page === 'jornadas') return true;
    if (page === 'ventas') return s.hasStock && s.cashOpened;
    if (['historial','gastos','reportes'].includes(page)) return s.saleReady;
    return true;
  },
  reason(page) {
    const s = this.snapshot();
    if (page === 'productos' && !s.hasCategory) return 'Primero crea al menos una categoría.';
    if (['movimientos','empleados'].includes(page) && !s.hasProduct) return 'Primero registra al menos un producto en Inventario.';
    if (page === 'caja' && !s.hasStock) return 'Primero agrega stock a por lo menos un producto.';
    if (page === 'ventas' && !s.cashOpened) return 'Primero abre una jornada desde Jornada y Caja.';
    if (['historial','gastos','reportes'].includes(page) && !s.saleReady) return 'Completa u omite la venta de prueba para habilitar este apartado.';
    return 'Este apartado todavía está bloqueado por el tutorial de inicio.';
  },
  explain(page) {
    Toast.show(this.reason(page), 'error');
    Router.go('configuracion');
  }
};

const Router = {
  current: null,

  routes: {
    dashboard: () => Auth.isAdmin() ? Pages.dashboardAdmin() : Pages.dashboardEmployee(),
    ventas: () => Pages.ventas(),
    historial: () => Pages.historial(),
    movimientos: () => Pages.movimientos(),
    categorias: () => Pages.categorias(),
    productos: () => Pages.productos(),
    empleados: () => Pages.empleados(),
    gastos: () => Pages.gastos(),
    caja: () => Pages.caja(),
    jornadas: () => Pages.jornadas(),
    reportes: () => Pages.reportes(),
    configuracion: () => Pages.configuracion(),
    productosDisponibles: () => Pages.productosDisponibles(),
    inicio: () => Pages.dashboardEmployee()
  },

  async go(page, options = {}) {
    if (!Auth.isLoggedIn()) {
      App.showLogin();
      return;
    }
    // En modo mantenimiento únicamente el administrador puede acceder a Configuración.
    if(typeof BackupManager!=='undefined' && BackupManager.isMaintenance){
      let locked=true;try{locked=await BackupManager.isMaintenance();}catch(e){console.warn('Estado de mantenimiento no verificable',e);}
      if(locked && !(Auth.isAdmin() && page==='configuracion')){
        this.current='mantenimiento';const main=document.getElementById('main-content');
        main.innerHTML='<section class="alert alert-warning m-3"><h2>Restauración en curso</h2><p>El sistema está temporalmente inhabilitado. El administrador debe finalizar y verificar la restauración.</p></section>';
        document.getElementById('fab-cart')?.classList.add('hidden');return;
      }
    }
    // Guard routes
    const adminOnly = ['movimientos', 'categorias', 'productos', 'empleados', 'gastos', 'reportes', 'configuracion'];
    if (adminOnly.includes(page) && !Auth.isAdmin()) {
      Toast.show('Acceso denegado', 'error');
      page = 'dashboard';
    }
    if (Auth.isAdmin() && !SetupGuide.isPageEnabled(page)) {
      Toast.show(SetupGuide.reason(page), 'error');
      page = 'configuracion';
    }
    this.current = page;
    if (typeof App !== 'undefined') App.refreshPending = false;
    const previousScrollY = window.scrollY || 0;
    const renderer = this.routes[page] || this.routes.dashboard;
    const main = document.getElementById('main-content');
    // Carga diferida: solo consultar las colecciones necesarias para la pantalla abierta.
    if (Store.preparePage) {
      main.innerHTML = `<div class="ux-data-loading"><div class="spinner-border spinner-border-sm" role="status"></div><span>Cargando datos necesarios…</span></div>`;
      try { await Store.preparePage(page); } catch (e) { console.warn('Carga diferida:', e); }
    }
    main.innerHTML = renderer();
    this.makeTablesMobileFriendly(main);
    if (typeof Pages !== 'undefined' && Pages.initPagination) Pages.initPagination(page);
    App.buildNav();
    this.updateNav();
    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('show');
    // FAB visibility
    const fab = document.getElementById('fab-cart');
    if (Auth.isEmployee() && (page === 'ventas' || page === 'inicio' || page === 'productosDisponibles')) {
      fab.classList.remove('hidden');
    } else {
      fab.classList.add('hidden');
    }
    App.updateCartBadge();
    window.scrollTo(0, options.preserveScroll ? previousScrollY : 0);
  },

  makeTablesMobileFriendly(root = document) {
    root.querySelectorAll('.table-wrap table, .table-responsive table, table.table').forEach(table => {
      table.classList.add('responsive-data-table');
      const headers = Array.from(table.querySelectorAll('thead th')).map((th, i) => {
        const txt = (th.textContent || '').trim();
        return txt || (i === 0 ? 'Imagen' : 'Detalle');
      });
      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = Array.from(row.children).filter(el => el.tagName === 'TD');
        // Empty-state rows keep their normal centered message.
        if (cells.length === 1 && Number(cells[0].getAttribute('colspan') || 1) > 1) {
          row.classList.add('mobile-empty-row');
          return;
        }
        cells.forEach((td, i) => td.setAttribute('data-label', headers[i] || `Dato ${i + 1}`));
      });
    });
  },

  updateNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === this.current);
    });
  }
};

const App = {
  refreshPending: false,
  dayWatchTimer: null,
  journeyReminderShown: false,

  // Utilidad pública usada por las vistas cuando una tabla se vuelve a renderizar.
  // En v33 quedó definida solo en Router; eso provocaba el error
  // `App.makeTablesMobileFriendly is not a function` y detenía los filtros antes
  // de actualizar sus totales. Mantenerla aquí evita ese fallo en todas las páginas.
  makeTablesMobileFriendly(root = document) {
    return Router.makeTablesMobileFriendly(root);
  },

  isInteracting() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay && !overlay.classList.contains('hidden')) return true;
    const el = document.activeElement;
    if (!el) return false;
    return ['INPUT','TEXTAREA','SELECT'].includes(el.tagName) || el.isContentEditable;
  },

  requestRefresh() {
    if (!Auth.isLoggedIn() || !Router.current) return;
    if (this.isInteracting()) {
      this.refreshPending = true;
      return;
    }
    this.refreshPending = false;
    Router.go(Router.current, { preserveScroll: true });
  },

  flushPendingRefresh() {
    if (!this.refreshPending || this.isInteracting()) return;
    this.refreshPending = false;
    if (Auth.isLoggedIn() && Router.current) Router.go(Router.current, { preserveScroll: true });
  },

  maybeShowJourneyReminder() {
    if(this.journeyReminderShown||!Auth.isLoggedIn())return;
    const u=Auth.currentUser(),j=Store.getOpenJourney?.(u?.id);
    if(!j)return;
    const mins=Store.journeyDurationMinutes?.(j)||0;
    const crossed=(j.fechaApertura||j.fecha)!==Store.today();
    if(!crossed&&mins<14*60)return;
    this.journeyReminderShown=true;
    const label=j.numero||Store.journeyNumber?.(j.id)||'Jornada';
    Modal.open(`
      <div class="modal-header"><h2>🌙 Jornada todavía abierta</h2><button class="btn-icon" onclick="Modal.close()">✕</button></div>
      <div class="modal-body">
        <p style="line-height:1.55">La <strong>${Utils.escapeHtml(label)}</strong> sigue abierta desde <strong>${Utils.formatDate(j.fechaApertura||j.fecha)} ${Utils.formatTime(j.horaApertura||j.hora)}</strong>.</p>
        <p class="ux-help">Si el bar continúa atendiendo, no necesitas hacer nada. La jornada no se cerrará automáticamente. Si la atención ya terminó, revisa el efectivo y finalízala.</p>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="Modal.close()">Continuar jornada</button><button class="btn btn-primary" onclick="Modal.close();Router.go('caja')">Revisar / finalizar</button></div>
    `);
  },

  startDayWatch() {
    if (this.dayWatchTimer) clearInterval(this.dayWatchTimer);
    this.dayWatchTimer = setInterval(async () => {
      if (!Auth.isLoggedIn() || !Store.refreshDailyContext) return;
      try {
        const r = await Store.refreshDailyContext();
        if (r?.changed) {
          const u=Auth.currentUser();
          const open=Store.state.cashSessions.some(c=>c.usuarioId===u?.id&&c.estado==='Abierta');
          Toast.show(open?'🌙 Cambió el día. Tu jornada sigue abierta y puedes continuar vendiendo normalmente.':'📅 Nuevo día detectado. Los indicadores del día ya se actualizaron.');
          this.requestRefresh();
        }
      } catch (e) { console.warn('Cambio de día:', e); }
    }, 60000);
  },

  stopDayWatch() {
    if (this.dayWatchTimer) clearInterval(this.dayWatchTimer);
    this.dayWatchTimer = null;
  },

  async init() {
    await Store.load();
    this.bindLogin();
    this.bindGlobal();

    if (Auth.isLoggedIn()) {
      this.showApp();
      this.startDayWatch();
      await Router.go(Auth.isAdmin() ? 'dashboard' : 'inicio');
      this.maybeShowJourneyReminder();
    } else {
      this.showLogin();
    }
  },

  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  },

  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    this.buildNav();
    this.updateUserInfo();
  },

  bindLogin() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-password').value;
      const err = document.getElementById('login-error');
      const res = await Store.login(email, pass);
      if (!res.ok) {
        err.textContent = res.error;
        err.classList.remove('hidden');
        return;
      }
      err.classList.add('hidden');
      this.showApp();
      this.startDayWatch();
      this.journeyReminderShown=false;
      await Router.go(Auth.isAdmin() ? 'dashboard' : 'inicio');
      this.maybeShowJourneyReminder();
      Toast.show(`Bienvenido, ${res.user.nombres || res.user.nombre || 'Usuario'}`);
    });

    document.getElementById('toggle-password').addEventListener('click', () => {
      const input = document.getElementById('login-password');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  },

  bindGlobal() {
    document.addEventListener('focusout', () => setTimeout(() => this.flushPendingRefresh(), 0));

    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      this.stopDayWatch();
      await Store.logout();
      this.journeyReminderShown=false;
      this.showLogin();
      Toast.show('Sesión cerrada');
    });

    document.getElementById('btn-menu-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      let backdrop = document.getElementById('sidebar-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'sidebar-backdrop';
        backdrop.className = 'sidebar-backdrop';
        backdrop.onclick = () => {
          document.getElementById('sidebar').classList.remove('open');
          backdrop.classList.remove('show');
        };
        document.body.appendChild(backdrop);
      }
      backdrop.classList.toggle('show');
    });

    document.getElementById('fab-cart')?.addEventListener('click', () => {
      Router.go('ventas');
      // scroll to cart on mobile
      setTimeout(() => {
        document.getElementById('cart-panel')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
  },

  openMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.add('open');
    let backdrop = document.getElementById('sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'sidebar-backdrop';
      backdrop.className = 'sidebar-backdrop';
      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('show');
      });
      document.body.appendChild(backdrop);
    }
    backdrop.classList.add('show');
  },

  buildNav() {
    const isAdmin = Auth.isAdmin();
    const menu = isAdmin ? [
      { page: 'dashboard', icon: '📊', label: 'Dashboard' },
      { page: 'ventas', icon: '🛒', label: 'Nueva venta' },
      { page: 'caja', icon: '🌙', label: 'Jornada y Caja' },
      { page: 'jornadas', icon: '📚', label: 'Jornadas' },
      { page: 'productos', icon: '📦', label: 'Inventario' },
      { page: 'categorias', icon: '📂', label: 'Categorías' },
      { page: 'movimientos', icon: '🔄', label: 'Movimientos' },
      { page: 'gastos', icon: '💸', label: 'Gastos' },
      { page: 'historial', icon: '🧾', label: 'Ventas' },
      { page: 'empleados', icon: '👥', label: 'Empleados' },
      { page: 'reportes', icon: '📈', label: 'Reportes' },
      { page: 'configuracion', icon: '⚙️', label: 'Configuración' }
    ] : [
      { page: 'inicio', icon: '🏠', label: 'Inicio' },
      { page: 'ventas', icon: '🛒', label: 'Nueva venta' },
      { page: 'historial', icon: '🧾', label: 'Mis ventas' },
      { page: 'productosDisponibles', icon: '📦', label: 'Inventario disponible' },
      { page: 'caja', icon: '🌙', label: 'Mi jornada y caja' },
      { page: 'jornadas', icon: '📚', label: 'Mis jornadas' }
    ];

    const navHtml = menu.map(m => {
      const enabled = !isAdmin || SetupGuide.isPageEnabled(m.page);
      return `
      <button class="nav-item ${enabled ? '' : 'nav-locked'}" data-page="${m.page}" onclick="${enabled ? `Router.go('${m.page}')` : `SetupGuide.explain('${m.page}')`}">
        <span class="nav-icon">${m.icon}</span>
        <span>${m.label}</span>${enabled ? '' : '<span class="nav-lock" aria-label="Bloqueado">🔒</span>'}
      </button>`;
    }).join('');

    document.getElementById('nav-menu').innerHTML = navHtml;

    // Navegación inferior móvil: accesos rápidos + botón para abrir el menú completo.
    const bottomItems = isAdmin
      ? [
          { page: 'dashboard', icon: '📊', label: 'Inicio' },
          { page: 'ventas', icon: '🛒', label: 'Vender' },
          { page: 'caja', icon: '🌙', label: 'Jornada' },
          { page: 'productos', icon: '📦', label: 'Inventario' }
        ]
      : [
          { page: 'inicio', icon: '🏠', label: 'Inicio' },
          { page: 'ventas', icon: '🛒', label: 'Vender' },
          { page: 'historial', icon: '🧾', label: 'Ventas' },
          { page: 'caja', icon: '🌙', label: 'Jornada' }
        ];

    const openMobileMenu = `
      <button class="nav-item mobile-more" type="button" onclick="App.openMobileMenu()">
        <span class="nav-icon">☰</span><span>Más</span>
      </button>`;
    document.getElementById('bottom-nav').innerHTML = bottomItems.map(m => {
      const enabled = !isAdmin || SetupGuide.isPageEnabled(m.page);
      return `
      <button class="nav-item ${enabled ? '' : 'nav-locked'}" data-page="${m.page}" onclick="${enabled ? `Router.go('${m.page}')` : `SetupGuide.explain('${m.page}')`}">
        <span class="nav-icon">${m.icon}</span>
        <span>${m.label}</span>${enabled ? '' : '<span class="nav-lock" aria-label="Bloqueado">🔒</span>'}
      </button>`;
    }).join('') + openMobileMenu;
  },

  updateUserInfo() {
    const u = Auth.currentUser();
    if (!u) return;
    // Compatible con perfiles antiguos (nombre/apellido) y nuevos (nombres/apellidos).
    const nombres = String(u.nombres || u.nombre || u.email || 'Usuario').trim();
    const apellidos = String(u.apellidos || u.apellido || '').trim();
    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    const info = document.getElementById('user-info');
    if (info) {
      info.innerHTML = `
        <div class="name">${Utils.escapeHtml(nombreCompleto)}</div>
        <div class="role">${u.role === 'admin' ? 'Administrador' : 'Empleado'}</div>
      `;
    }
    const mobile = document.getElementById('mobile-user');
    if (mobile) {
      mobile.textContent = (nombres.charAt(0) || 'U').toUpperCase();
      mobile.title = nombreCompleto;
    }
  },

  updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = Store.state.cart.reduce((s, c) => s + c.cantidad, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
};

// Errores no controlados: mostrarlos de forma legible en vez de dejar la app silenciosa.
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  const msg = e.reason?.message || 'Ocurrió un error inesperado';
  try { Toast.show(msg, 'error'); } catch (_) {}
});
window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
});

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      reg.update().catch(() => {});
    } catch (e) { console.warn(e); }
  });
}
