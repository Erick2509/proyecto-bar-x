/* Reusable UI fragments */
const Components = {
  empty(icon, text, actionHtml = '') {
    return `
      <div class="empty-state">
        <div class="es-icon">${icon}</div>
        <p>${text}</p>
        ${actionHtml}
      </div>
    `;
  },

  stockStatusBadge(p) {
    return Utils.stockBadge(Store.stockStatus(p));
  },

  productRow(p, actionsHtml) {
    const cat = Store.getCategory(p.categoriaId);
    return `
      <tr>
        <td data-label="Imagen"><span class="product-img-placeholder">${p.imagen || '📦'}</span></td>
        <td data-label="Producto"><strong>${Utils.escapeHtml(p.nombre)}</strong></td>
        <td data-label="Categoría">${Utils.escapeHtml(cat?.nombre || '—')}</td>
        <td data-label="Precio" style="color:var(--amber)">${Utils.formatMoney(p.precioVenta)}</td>
        <td data-label="Stock">${p.stock}</td>
        <td data-label="Estado stock">${this.stockStatusBadge(p)}</td>
        <td data-label="Estado">${p.estado === 'Activo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-neutral">Inactivo</span>'}</td>
        <td class="table-actions" data-label="Acciones">${actionsHtml}</td>
      </tr>
    `;
  },

  mobileProductCard(p, actionsHtml) {
    const cat = Store.getCategory(p.categoriaId);
    return `
      <div class="card" style="margin-bottom:0.75rem">
        <div style="display:flex;gap:0.75rem;align-items:flex-start">
          <span style="font-size:1.8rem">${p.imagen || '📦'}</span>
          <div style="flex:1;min-width:0">
            <strong>${Utils.escapeHtml(p.nombre)}</strong>
            <div style="font-size:0.8rem;color:var(--text-muted)">${Utils.escapeHtml(cat?.nombre || '')}</div>
            <div style="margin-top:0.35rem;display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center">
              <span style="color:var(--amber);font-weight:600">${Utils.formatMoney(p.precioVenta)}</span>
              <span>Stock: ${p.stock}</span>
              ${this.stockStatusBadge(p)}
            </div>
            <div style="margin-top:0.6rem">${actionsHtml}</div>
          </div>
        </div>
      </div>
    `;
  }
};
