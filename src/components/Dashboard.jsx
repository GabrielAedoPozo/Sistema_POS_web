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

  // Análisis de productos vendidos
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
    <section className='h-full flex flex-col overflow-hidden'>
      {/* Header */}
      <header className='shrink-0 bg-white border-b border-slate-300 px-6 py-3 flex items-center justify-between'>
        <h3 className='text-lg font-bold text-slate-900'>📊 Dashboard</h3>
      </header>

      {/* Contenedor Scrolleable */}
      <div className='flex-1 overflow-y-auto'>
        <div className='p-6 space-y-6 pb-8'>
          {/* Sección 1: KPIs Principales */}
          <div className='bg-white rounded-xl border border-slate-300 p-6'>
            <h4 className='text-sm font-bold text-slate-800 mb-4'>⚡ KPIs Principales</h4>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
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
            </div>
          </div>

          {/* Sección 2: Análisis de Stock */}
          <div className='bg-white rounded-xl border border-slate-300 p-6'>
            <h4 className='text-sm font-bold text-slate-800 mb-4'>📦 Análisis de Stock</h4>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
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

              <div className='bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200 p-4'>
                <p className='text-xs text-cyan-700 font-semibold mb-1'>Promedio Stock</p>
                <p className='text-2xl font-bold text-cyan-900'>
                  {products.length > 0 ? (products.reduce((sum, p) => sum + p.stock, 0) / products.length).toFixed(1) : '0'}
                </p>
                <p className='text-xs text-cyan-700 mt-1'>por producto</p>
              </div>
            </div>
          </div>

          {/* Sección 3: Gráficos */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            {/* Tendencias Semanal */}
            <div className='bg-white rounded-xl border border-slate-300 p-6'>
              <h4 className='text-sm font-bold text-slate-800 mb-4'>📈 Tendencia Últimos 7 Días</h4>
              <div className='space-y-3'>
                {tendencias.map((t, idx) => (
                  <div key={idx} className='flex items-center gap-3'>
                    <span className='text-xs font-semibold text-slate-600 w-10'>{t.dia}</span>
                    <div className='flex-1 h-6 bg-blue-100 rounded-lg overflow-hidden'>
                      <div
                        className='h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all'
                        style={{ width: `${(t.ventas / maxVentas) * 100}%` }}
                      ></div>
                    </div>
                    <div className='text-right w-20'>
                      <p className='text-xs font-bold text-slate-900'>{t.ventas} ventas</p>
                      <p className='text-xs text-slate-600'>{formatMoney(t.ingresos)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Productos */}
            <div className='bg-white rounded-xl border border-slate-300 p-6'>
              <h4 className='text-sm font-bold text-slate-800 mb-4'>🏆 Top 5 Productos Vendidos</h4>
              <div className='space-y-2'>
                {topProductos.length === 0 ? (
                  <p className='text-xs text-slate-500'>Sin datos de ventas</p>
                ) : (
                  topProductos.map(([nombre, stats], idx) => (
                    <div key={idx} className='bg-gradient-to-r from-slate-50 to-white rounded-lg p-3 border border-slate-200'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-xs font-semibold text-slate-900'>
                          {idx + 1}. {nombre}
                        </span>
                        <span className='text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded'>{stats.cantidadVendida}</span>
                      </div>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-slate-600'>{stats.ordenes} órdenes</span>
                        <span className='text-green-700 font-semibold'>{formatMoney(stats.montoTotal)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        

        
        </div>
      </div>
    </section>
  )
}

export default Dashboard


