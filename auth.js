/* Auth helpers */
const Auth = {
  isLoggedIn() {
    return !!Store.state.currentUser;
  },
  isAdmin() {
    return Store.state.currentUser?.role === 'admin';
  },
  isEmployee() {
    return Store.state.currentUser?.role === 'empleado';
  },
  requireAdmin() {
    if (!this.isAdmin()) {
      Toast.show('Acceso denegado', 'error');
      Router.go('dashboard');
      return false;
    }
    return true;
  },
  currentUser() {
    return Store.state.currentUser;
  }
};
