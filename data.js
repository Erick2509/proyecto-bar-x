/* ===== INITIAL SEED DATA ===== */
const SEED = {
  users: [
    {
      id: 'u1',
      email: 'admin@proyectox.com',
      password: 'admin123',
      role: 'admin',
      nombres: 'Carlos',
      apellidos: 'Mendoza',
      dni: '12345678',
      telefono: '999888777',
      estado: 'Activo'
    },
    {
      id: 'u2',
      email: 'empleado@proyectox.com',
      password: 'empleado123',
      role: 'empleado',
      nombres: 'Lucía',
      apellidos: 'Ramos',
      dni: '87654321',
      telefono: '987654321',
      estado: 'Activo'
    }
  ],
  categories: [
    { id: 'c1', nombre: 'Cervezas', estado: 'Activo' },
    { id: 'c2', nombre: 'Gaseosas', estado: 'Activo' },
    { id: 'c3', nombre: 'Licores', estado: 'Activo' },
    { id: 'c4', nombre: 'Vinos', estado: 'Activo' },
    { id: 'c5', nombre: 'Snacks', estado: 'Activo' },
    { id: 'c6', nombre: 'Agua', estado: 'Activo' }
  ],
  products: [
    { id: 'p1', nombre: 'Cerveza Pilsen 355ml', categoriaId: 'c1', precioCompra: 2.50, precioVenta: 6.00, stock: 48, stockMinimo: 12, descripcion: 'Cerveza rubia clásica', imagen: '🍺', estado: 'Activo' },
    { id: 'p2', nombre: 'Cerveza Cusqueña 355ml', categoriaId: 'c1', precioCompra: 3.00, precioVenta: 7.50, stock: 36, stockMinimo: 10, descripcion: 'Cerveza premium', imagen: '🍺', estado: 'Activo' },
    { id: 'p3', nombre: 'Cerveza Cristal 355ml', categoriaId: 'c1', precioCompra: 2.20, precioVenta: 5.50, stock: 8, stockMinimo: 15, descripcion: 'Cerveza ligera', imagen: '🍺', estado: 'Activo' },
    { id: 'p4', nombre: 'Coca Cola 500ml', categoriaId: 'c2', precioCompra: 1.80, precioVenta: 4.00, stock: 60, stockMinimo: 20, descripcion: 'Gaseosa clásica', imagen: '🥤', estado: 'Activo' },
    { id: 'p5', nombre: 'Inca Kola 500ml', categoriaId: 'c2', precioCompra: 1.80, precioVenta: 4.00, stock: 5, stockMinimo: 15, descripcion: 'Sabor único peruano', imagen: '🥤', estado: 'Activo' },
    { id: 'p6', nombre: 'Agua San Luis 600ml', categoriaId: 'c6', precioCompra: 1.00, precioVenta: 2.50, stock: 0, stockMinimo: 24, descripcion: 'Agua mineral', imagen: '💧', estado: 'Activo' },
    { id: 'p7', nombre: 'Whisky Johnnie Walker Red', categoriaId: 'c3', precioCompra: 45.00, precioVenta: 85.00, stock: 6, stockMinimo: 3, descripcion: 'Botella 750ml', imagen: '🥃', estado: 'Activo' },
    { id: 'p8', nombre: 'Ron Cartavio Black', categoriaId: 'c3', precioCompra: 28.00, precioVenta: 55.00, stock: 10, stockMinimo: 4, descripcion: 'Botella 750ml', imagen: '🥃', estado: 'Activo' },
    { id: 'p9', nombre: 'Vodka Absolut', categoriaId: 'c3', precioCompra: 38.00, precioVenta: 75.00, stock: 4, stockMinimo: 3, descripcion: 'Botella 750ml', imagen: '🍸', estado: 'Activo' },
    { id: 'p10', nombre: 'Papas Lays Clásicas', categoriaId: 'c5', precioCompra: 2.50, precioVenta: 5.00, stock: 25, stockMinimo: 10, descripcion: 'Bolsa mediana', imagen: '🍟', estado: 'Activo' }
  ],
  // Sales will be generated with movements
  sales: [],
  movements: [],
  expenses: [
    {
      id: 'e1',
      fecha: '2026-09-14',
      hora: '10:30:00',
      concepto: 'Alquiler del local - Septiembre',
      categoria: 'Alquiler',
      monto: 2500.00,
      origen: 'Manual',
      usuarioId: 'u1'
    }
  ]
};

// Generate some initial movements and a couple of sales for demo
(function seedDemo() {
  // Initial entry movements for products with stock > 0
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  SEED.products.forEach((p, i) => {
    if (p.stock > 0) {
      const d = new Date(yesterday);
      d.setHours(9 + i, 10 + i * 3, 0);
      SEED.movements.push({
        id: 'm' + (i + 1),
        fecha: d.toISOString().slice(0, 10),
        hora: d.toTimeString().slice(0, 8),
        productoId: p.id,
        tipo: 'Entrada',
        cantidad: p.stock,
        stockAnterior: 0,
        stockNuevo: p.stock,
        usuarioId: 'u1'
      });
      // Auto expense for initial stock
      SEED.expenses.push({
        id: 'e-init-' + p.id,
        fecha: d.toISOString().slice(0, 10),
        hora: d.toTimeString().slice(0, 8),
        concepto: `Compra inicial: ${p.nombre}`,
        categoria: 'Inventario',
        monto: +(p.stock * p.precioCompra).toFixed(2),
        origen: 'Compra de inventario',
        usuarioId: 'u1'
      });
    }
  });

  // One sample sale from empleado
  const saleDate = new Date(yesterday);
  saleDate.setHours(20, 15, 0);
  SEED.sales.push({
    id: 's1',
    fecha: saleDate.toISOString().slice(0, 10),
    hora: saleDate.toTimeString().slice(0, 8),
    empleadoId: 'u2',
    items: [
      { productoId: 'p1', cantidad: 2, precioUnitario: 6.00, subtotal: 12.00 },
      { productoId: 'p4', cantidad: 1, precioUnitario: 4.00, subtotal: 4.00 }
    ],
    total: 16.00,
    metodoPago: 'Efectivo'
  });
  // Adjust stock for that sale (already reflected in current stock numbers for simplicity in seed)
  // Add movement for sale
  SEED.movements.push({
    id: 'm-sale-1a',
    fecha: saleDate.toISOString().slice(0, 10),
    hora: saleDate.toTimeString().slice(0, 8),
    productoId: 'p1',
    tipo: 'Venta',
    cantidad: 2,
    stockAnterior: 50,
    stockNuevo: 48,
    usuarioId: 'u2'
  });
  SEED.movements.push({
    id: 'm-sale-1b',
    fecha: saleDate.toISOString().slice(0, 10),
    hora: saleDate.toTimeString().slice(0, 8),
    productoId: 'p4',
    tipo: 'Venta',
    cantidad: 1,
    stockAnterior: 61,
    stockNuevo: 60,
    usuarioId: 'u2'
  });
})();
