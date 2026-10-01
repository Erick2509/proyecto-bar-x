/* Utilities */
const Utils = {
  formatMoney(n) {
    return 'S/ ' + Number(n).toFixed(2);
  },
  formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  },
  formatDateTime(fecha, hora) {
    return `${this.formatDate(fecha)} ${hora || ''}`.trim();
  },
  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },
  stockBadge(status) {
    if (status === 'agotado') return '<span class="badge badge-danger">🔴 Agotado</span>';
    if (status === 'bajo') return '<span class="badge badge-warning">🟡 Bajo</span>';
    return '<span class="badge badge-success">🟢 Normal</span>';
  },
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
  debounce(fn, ms = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
};

const Toast = {
  show(msg, type = 'success', duration = 3200) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all 0.25s';
      setTimeout(() => el.remove(), 260);
    }, duration);
  }
};

const Modal = {
  open(html) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    modal.innerHTML = html;
    overlay.classList.remove('hidden');
    // close on backdrop click
    overlay.onclick = (e) => {
      if (e.target === overlay) this.close();
    };
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal').innerHTML = '';
  }
};

function confirmAction(message, onConfirm) {
  Modal.open(`
    <div class="modal-header">
      <h2>Confirmar</h2>
      <button class="btn-icon" onclick="Modal.close()">✕</button>
    </div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);line-height:1.5">${Utils.escapeHtml(message)}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-danger" id="confirm-yes">Eliminar</button>
    </div>
  `);
  document.getElementById('confirm-yes').onclick = () => {
    Modal.close();
    onConfirm();
  };
}
