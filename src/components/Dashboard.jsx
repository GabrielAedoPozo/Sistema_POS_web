function Dashboard({ products, salesHistory }) {
  // Cálculos KPI
  const calcularKPIs = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const ventasHoy = salesHistory.filter((sale) => {
      const saleDate = new Date(sale.createdAt)
      saleDate.setHours(0, 0, 0, 0)
      return saleDate.getTime() === today.getTime()
    })

    const ingresoHoy = ventasHoy.reduce((sum, sale) => sum + sale.total, 0)
    const totalIngresos = salesHistory.reduce((sum, sale) => sum + sale.total, 0)
    const valorInventario = products.reduce((sum, p) => sum + (p.precio * p.stock), 0)

    return {
      ventasHoy: ventasHoy.length,
      ingresoHoy,
      totalIngresos,
      totalVentas: salesHistory.length,
      valorInventario,
      productosTotal: products.length,
    }
  }

  // Análisis de stock
  const analisisStock = () => {
    const bajo = products.filter((p) => p.stock < 5)
    const medio = products.filter((p) => p.stock >= 5 && p.stock < 15)
    const alto = products.filter((p) => p.stock >= 15)

    return { bajo, medio, alto }
  }

  // Análisis de productos
  const analisisProductos = () => {
    const productStats = {}

    salesHistory.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productStats[item.name]) {
          productStats[item.name] = {
            cantidadVendida: 0,
            montoTotal: 0,
            ordenes: 0,
            stockActual: products.find((p) => p.nombre === item.name)?.stock || 0,
          }
        }
        productStats[item.name].cantidadVendida += item.qty
        productStats[item.name].montoTotal += item.price * item.qty
        productStats[item.name].ordenes += 1
      })
    })

    return productStats
  }

  // Tendencias por día
  const tendenciasSemanal = () => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const ahora = new Date()
    const ventasPorDia = {}

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(ahora)
      fecha.setDate(fecha.getDate() - i)
      const diaKey = fecha.toLocaleDateString('es-PE')
      ventasPorDia[diaKey] = {
        dia: dias[fecha.getDay()],
        ventas: 0,
        ingresos: 0,
      }
    }

    salesHistory.forEach((sale) => {
      const diaKey = new Date(sale.createdAt).toLocaleDateString('es-PE')
      if (ventasPorDia[diaKey]) {
        ventasPorDia[diaKey].ventas += 1
        ventasPorDia[diaKey].ingresos += sale.total
      }
    })

    return Object.values(ventasPorDia)
  }

  const kpis = calcularKPIs()
  const stock = analisisStock()
  const productStats = analisisProductos()
  const tendencias = tendenciasSemanal()

  const topProductos = Object.entries(productStats)
    .sort(([, a], [, b]) => b.cantidadVendida - a.cantidadVendida)
    .slice(0, 5)

  const formatMoney = (amount) => `$${Number(amount).toFixed(2)}`
  const maxVentas = Math.max(...tendencias.map((t) => t.ventas), 1)

  return (
    <section className='h-full flex flex-col gap-4 overflow-hidden pb-4'>
      {/* KPIs Principales */}
      <div className='grid grid-cols-6 gap-3 shrink-0'>
        <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4'>
          <p className='text-xs text-blue-700 font-semibold mb-1'>Ventas Hoy</p>
          <p className='text-2xl font-bold text-blue-900'>{kpis.ventasHoy}</p>
          <p className='text-xs text-blue-700 mt-1'>{formatMoney(kpis.ingresoHoy)}</p>
        </div>

        <div className='bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4'>
          <p className='text-xs text-green-700 font-semibold mb-1'>Total Ingresos</p>
          <p className='text-2xl font-bold text-green-900'>{formatMoney(kpis.totalIngresos)}</p>
          <p className='text-xs text-green-700 mt-1'>{kpis.totalVentas} ventas</p>
        </div>

        <div className='bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4'>
          <p className='text-xs text-purple-700 font-semibold mb-1'>Valor Inventario</p>
          <p className='text-2xl font-bold text-purple-900'>{formatMoney(kpis.valorInventario)}</p>
          <p className='text-xs text-purple-700 mt-1'>{kpis.productosTotal} productos</p>
        </div>

        <div className='bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-4'>
          <p className='text-xs text-orange-700 font-semibold mb-1'>Stock Bajo</p>
          <p className='text-2xl font-bold text-orange-900'>{stock.bajo.length}</p>
          <p className='text-xs text-orange-700 mt-1'>productos críticos</p>
        </div>

        <div className='bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 p-4'>
          <p className='text-xs text-yellow-700 font-semibold mb-1'>Stock Medio</p>
          <p className='text-2xl font-bold text-yellow-900'>{stock.medio.length}</p>
          <p className='text-xs text-yellow-700 mt-1'>productos normales</p>
        </div>

        <div className='bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-300 p-4'>
          <p className='text-xs text-slate-700 font-semibold mb-1'>Stock Óptimo</p>
          <p className='text-2xl font-bold text-slate-900'>{stock.alto.length}</p>
          <p className='text-xs text-slate-700 mt-1'>productos en orden</p>
        </div>
      </div>

      {/* Segundo Row */}
      <div className='grid grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden'>
        {/* Tendencias Semanal */}
        <div className='bg-white rounded-xl border border-slate-300 p-4 overflow-hidden flex flex-col'>
          <h3 className='font-semibold text-slate-800 mb-3 text-sm'>📊 Tendencia Últimos 7 Días</h3>
          <div className='flex-1 flex flex-col justify-end gap-3'>
            {tendencias.map((t, idx) => (
              <div key={idx} className='flex items-center gap-2'>
                <span className='text-xs font-semibold text-slate-600 w-10'>{t.dia}</span>
                <div className='flex-1 h-6 bg-blue-100 rounded-lg relative overflow-hidden'>
                  <div
                    className='h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all'
                    style={{ width: `${(t.ventas / maxVentas) * 100}%` }}
                  ></div>
                </div>
                <span className='text-xs font-semibold text-slate-700 w-8 text-right'>{t.ventas}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Productos */}
        <div className='bg-white rounded-xl border border-slate-300 p-4 overflow-hidden flex flex-col'>
          <h3 className='font-semibold text-slate-800 mb-3 text-sm'>🏆 Top 5 Productos</h3>
          <div className='flex-1 overflow-y-auto space-y-2'>
            {topProductos.length === 0 ? (
              <p className='text-xs text-slate-500'>Sin datos de ventas</p>
            ) : (
              topProductos.map(([nombre, stats], idx) => (
                <div key={idx} className='bg-gradient-to-r from-slate-50 to-white rounded-lg p-2 border border-slate-200'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-semibold text-slate-900'>
                      {idx + 1}. {nombre}
                    </span>
                    <span className='text-xs font-bold text-blue-600'>{stats.cantidadVendida}</span>
                  </div>
                  <div className='flex items-center justify-between mt-1'>
                    <span className='text-xs text-slate-600'>{stats.ordenes} órdenes</span>
                    <span className='text-xs text-green-700 font-semibold'>{formatMoney(stats.montoTotal)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alertas de Stock */}
        <div className='bg-white rounded-xl border border-slate-300 p-4 overflow-hidden flex flex-col'>
          <h3 className='font-semibold text-slate-800 mb-3 text-sm flex items-center gap-2'>
            <span className='text-lg'>⚠️</span> Alertas de Stock
          </h3>
          <div className='flex-1 overflow-y-auto space-y-2'>
            {stock.bajo.length === 0 ? (
              <p className='text-xs text-green-600 font-semibold'>✓ Todo está bien</p>
            ) : (
              stock.bajo.map((p, idx) => (
                <div
                  key={idx}
                  className='bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-2 border border-red-200'
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-semibold text-red-900'>{p.nombre}</span>
                    <span className='text-xs font-bold text-red-700 bg-red-200 px-2 py-1 rounded'>
                      {p.stock} u.
                    </span>
                  </div>
                  <p className='text-xs text-red-700 mt-1'>
                    Precio: {formatMoney(p.precio)}
                  </p>
                </div>
              ))
            )}

            {stock.medio.length > 0 && (
              <>
                <div className='border-t border-slate-200 mt-2 pt-2'>
                  <p className='text-xs font-semibold text-yellow-700 mb-2'>⚡ Stock Bajo (Advertencia)</p>
                  {stock.medio.map((p, idx) => (
                    <div key={idx} className='bg-yellow-50 rounded-lg p-2 border border-yellow-200 mb-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-xs font-semibold text-yellow-900'>{p.nombre}</span>
                        <span className='text-xs font-bold text-yellow-700'>{p.stock} u.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resumen Financiero */}
      <div className='grid grid-cols-4 gap-3 shrink-0'>
        <div className='bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-3'>
          <p className='text-xs text-indigo-700 font-semibold'>Promedio Ticket</p>
          <p className='text-xl font-bold text-indigo-900'>
            {kpis.totalVentas > 0 ? formatMoney(kpis.totalIngresos / kpis.totalVentas) : '$0.00'}
          </p>
        </div>

        <div className='bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200 p-3'>
          <p className='text-xs text-cyan-700 font-semibold'>Productos Únicos Vendidos</p>
          <p className='text-xl font-bold text-cyan-900'>{Object.keys(productStats).length}</p>
        </div>

        <div className='bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl border border-rose-200 p-3'>
          <p className='text-xs text-rose-700 font-semibold'>Promedio Stock/Producto</p>
          <p className='text-xl font-bold text-rose-900'>
            {products.length > 0 ? (products.reduce((sum, p) => sum + p.stock, 0) / products.length).toFixed(1) : '0'}
          </p>
        </div>

        <div className='bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border border-teal-200 p-3'>
          <p className='text-xs text-teal-700 font-semibold'>Tasa Rotación</p>
          <p className='text-xl font-bold text-teal-900'>
            {products.length > 0
              ? (
                  (salesHistory.reduce((sum, sale) => sum + sale.items.reduce((ssum, item) => ssum + item.qty, 0), 0) /
                    products.reduce((sum, p) => sum + p.stock, 0)) * 100
                ).toFixed(1)
              : '0'}
            %
          </p>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
