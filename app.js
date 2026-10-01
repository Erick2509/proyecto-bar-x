/* ===== APP ROUTER & INIT ===== */
const Router = {
  current: null,

  routes: {
    dashboard: () => Auth.isAdmin() ? Pages.dashboardAdmin() : Pages.dashboardEmployee(),
    ventas: () => Pages.ventas(),
    historial: () => Pages.historial(),
    inventario: () => Pages.inventario(),
    movimientos: () => Pages.movimientos(),
    categorias: () => Pages.categorias(),
    productos: () => Pages.productos(),
    empleados: () => Pages.empleados(),
    gastos: () => Pages.gastos(),
    caja: () => Pages.caja(),
    reportes: () => Pages.reportes(),
    configuracion: () => Pages.configuracion(),
    productosDisponibles: () => Pages.productosDisponibles(),
    inicio: () => Pages.dashboardEmployee()
  },

  go(page) {
    if (!Auth.isLoggedIn()) {
      App.showLogin();
      return;
    }
    // Guard routes
    const adminOnly = ['inventario', 'movimientos', 'categorias', 'productos', 'empleados', 'gastos', 'reportes', 'configuracion'];
    if (adminOnly.includes(page) && !Auth.isAdmin()) {
      Toast.show('Acceso denegado', 'error');
      page = 'dashboard';
    }
    this.current = page;
    const renderer = this.routes[page] || this.routes.dashboard;
    const main = document.getElementById('main-content');
    main.innerHTML = renderer();
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
    window.scrollTo(0, 0);
  },

  updateNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === this.current);
    });
  }
};

const App = {
  async init() {
    await Store.load();
    this.bindLogin();
    this.bindGlobal();

    if (Auth.isLoggedIn()) {
      this.showApp();
      Router.go(Auth.isAdmin() ? 'dashboard' : 'inicio');
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
      Router.go(Auth.isAdmin() ? 'dashboard' : 'inicio');
      Toast.show(`Bienvenido, ${res.user.nombres || res.user.nombre || 'Usuario'}`);
    });

    document.getElementById('toggle-password').addEventListener('click', () => {
      const input = document.getElementById('login-password');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  },

  bindGlobal() {
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await Store.logout();
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
      { page: 'caja', icon: '💰', label: 'Caja' },
      { page: 'productos', icon: '🏷️', label: 'Productos' },
      { page: 'categorias', icon: '📂', label: 'Categorías' },
      { page: 'inventario', icon: '📦', label: 'Inventario' },
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
      { page: 'productosDisponibles', icon: '📦', label: 'Productos disponibles' },
      { page: 'caja', icon: '💰', label: 'Mi caja' }
    ];

    const navHtml = menu.map(m => `
      <button class="nav-item" data-page="${m.page}" onclick="Router.go('${m.page}')">
        <span class="nav-icon">${m.icon}</span>
        <span>${m.label}</span>
      </button>
    `).join('');

    document.getElementById('nav-menu').innerHTML = navHtml;

    // Navegación inferior móvil: accesos rápidos + botón para abrir el menú completo.
    const bottomItems = isAdmin
      ? [
          { page: 'dashboard', icon: '📊', label: 'Inicio' },
          { page: 'ventas', icon: '🛒', label: 'Vender' },
          { page: 'caja', icon: '💰', label: 'Caja' },
          { page: 'productos', icon: '🏷️', label: 'Productos' }
        ]
      : [
          { page: 'inicio', icon: '🏠', label: 'Inicio' },
          { page: 'ventas', icon: '🛒', label: 'Vender' },
          { page: 'historial', icon: '🧾', label: 'Ventas' },
          { page: 'caja', icon: '💰', label: 'Caja' }
        ];

    const openMobileMenu = `
      <button class="nav-item mobile-more" type="button" onclick="App.openMobileMenu()">
        <span class="nav-icon">☰</span><span>Más</span>
      </button>`;
    document.getElementById('bottom-nav').innerHTML = bottomItems.map(m => `
      <button class="nav-item" data-page="${m.page}" onclick="Router.go('${m.page}')">
        <span class="nav-icon">${m.icon}</span>
        <span>${m.label}</span>
      </button>
    `).join('') + openMobileMenu;
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

if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));
