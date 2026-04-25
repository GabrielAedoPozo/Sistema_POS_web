function Dashboard({ products, salesHistory }) {
  const getSaleProfit = (sale) => sale.items.reduce((sum, item) => {
    const costo = Number(item.cost ?? 0)
    return sum + (Number(item.price) - costo) * Number(item.qty)
  }, 0)

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
    const gananciaHoy = ventasHoy.reduce((sum, sale) => sum + getSaleProfit(sale), 0)
    const totalIngresos = salesHistory.reduce((sum, sale) => sum + sale.total, 0)
    const totalGanancias = salesHistory.reduce((sum, sale) => sum + getSaleProfit(sale), 0)
    const valorInventario = products.reduce(
      (sum, p) => sum + (Number(p.precio_compra ?? 0) * Number(p.stock)),
      0
    )

    return {
      ventasHoy: ventasHoy.length,
      ingresoHoy,
      gananciaHoy,
      totalIngresos,
      totalGanancias,
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

  const analisisDiaHora = () => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
    const ventasPorDia = dias.map((dia) => ({ dia, unidades: 0 }))
    const ventasPorHora = Array.from({ length: 24 }, (_, hora) => ({
      hora,
      unidades: 0,
    }))

    salesHistory.forEach((sale) => {
      const fecha = new Date(sale.createdAt)
      const diaIndex = fecha.getDay()
      const hora = fecha.getHours()
      const unidades = sale.items.reduce((sum, item) => sum + item.qty, 0)

      ventasPorDia[diaIndex].unidades += unidades
      ventasPorHora[hora].unidades += unidades
    })

    const picoDia = ventasPorDia.reduce((max, actual) =>
      actual.unidades > max.unidades ? actual : max
    , ventasPorDia[0])

    const picoHora = ventasPorHora.reduce((max, actual) =>
      actual.unidades > max.unidades ? actual : max
    , ventasPorHora[0])

    return {
      ventasPorDia,
      ventasPorHora,
      picoDia,
      picoHora,
    }
  }

  const topProductos = Object.entries(productStats)
    .sort(([, a], [, b]) => b.cantidadVendida - a.cantidadVendida)
    .slice(0, 5)

  const diaHora = analisisDiaHora()

  const formatMoney = (amount) => `S/ ${Number(amount).toFixed(2)}`
  const maxVentas = Math.max(...tendencias.map((t) => t.ventas), 1)
  const maxUnidadesDia = Math.max(...diaHora.ventasPorDia.map((d) => d.unidades), 1)
  const maxUnidadesHora = Math.max(...diaHora.ventasPorHora.map((h) => h.unidades), 1)

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
              <div className='bg-blue-50 rounded-xl border border-blue-200 p-4'>
                <p className='text-xs text-blue-700 font-semibold mb-1'>Ventas Hoy</p>
                <p className='text-2xl font-bold text-blue-900'>{kpis.ventasHoy}</p>
                <p className='text-xs text-blue-700 mt-1'>{formatMoney(kpis.ingresoHoy)}</p>
              </div>

              <div className='bg-slate-50 rounded-xl border border-slate-200 p-4'>
                <p className='text-xs text-slate-600 font-semibold mb-1'>Total Ingresos</p>
                <p className='text-2xl font-bold text-slate-900'>{formatMoney(kpis.totalIngresos)}</p>
                <p className='text-xs text-slate-600 mt-1'>{kpis.totalVentas} ventas</p>
              </div>

              <div className='bg-slate-50 rounded-xl border border-slate-200 p-4'>
                <p className='text-xs text-slate-600 font-semibold mb-1'>Ganancia Total</p>
                <p className='text-2xl font-bold text-emerald-700'>{formatMoney(kpis.totalGanancias)}</p>
                <p className='text-xs text-slate-600 mt-1'>Ganancia hoy: {formatMoney(kpis.gananciaHoy)}</p>
              </div>

              <div className='bg-slate-50 rounded-xl border border-slate-200 p-4'>
                <p className='text-xs text-slate-600 font-semibold mb-1'>Stock Bajo</p>
                <p className='text-2xl font-bold text-slate-900'>{stock.bajo.length}</p>
                <p className='text-xs text-slate-600 mt-1'>productos críticos</p>
              </div>
            </div>
            <div className='mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
              Valor de inventario (a costo): <span className='font-semibold'>{formatMoney(kpis.valorInventario)}</span> en {kpis.productosTotal} productos.
            </div>
          </div>

          {/* Sección 2: Análisis de Stock */}
          <div className='bg-white rounded-xl border border-slate-300 p-6'>
            <h4 className='text-sm font-bold text-slate-800 mb-4'>📦 Análisis de Stock</h4>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='bg-slate-50 rounded-xl border border-slate-200 p-4'>
                <p className='text-xs text-slate-600 font-semibold mb-1'>Stock Medio</p>
                <p className='text-2xl font-bold text-slate-900'>{stock.medio.length}</p>
                <p className='text-xs text-slate-600 mt-1'>productos normales</p>
              </div>

              <div className='bg-slate-50 rounded-xl border border-slate-200 p-4'>
                <p className='text-xs text-slate-700 font-semibold mb-1'>Stock Óptimo</p>
                <p className='text-2xl font-bold text-slate-900'>{stock.alto.length}</p>
                <p className='text-xs text-slate-700 mt-1'>productos en orden</p>
              </div>

              <div className='bg-slate-50 rounded-xl border border-slate-200 p-4'>
                <p className='text-xs text-slate-600 font-semibold mb-1'>Promedio Stock</p>
                <p className='text-2xl font-bold text-slate-900'>
                  {products.length > 0 ? (products.reduce((sum, p) => sum + p.stock, 0) / products.length).toFixed(1) : '0'}
                </p>
                <p className='text-xs text-slate-600 mt-1'>por producto</p>
              </div>
            </div>
          </div>

          {/* Sección 3: Gráficos */}
          <div className='grid grid-cols-1 gap-6'>
            {/* Tendencias Semanal */}
            <div className='bg-white rounded-xl border border-slate-300 p-6'>
              <h4 className='text-sm font-bold text-slate-800 mb-4'>📈 Tendencia Últimos 7 Días</h4>
              <div className='space-y-3'>
                {tendencias.map((t, idx) => (
                  <div key={idx} className='flex items-center gap-3'>
                    <span className='text-xs font-semibold text-slate-600 w-10'>{t.dia}</span>
                    <div className='flex-1 h-6 bg-blue-100 rounded-lg overflow-hidden'>
                      <div
                        className='h-full bg-linear-to-r from-blue-500 to-blue-600 transition-all'
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

          
          </div>

          {/* Sección 4: Día y Hora con Mayor Venta */}
          <div className='bg-white rounded-xl border border-slate-300 p-6'>
            <div className='flex items-center justify-between mb-4 gap-3 flex-wrap'>
              <h4 className='text-sm font-bold text-slate-800'>🕒 ¿Cuándo se vende más?</h4>
              <p className='text-xs text-slate-600'>
                Pico por día: <span className='font-semibold text-slate-800'>{diaHora.picoDia.dia}</span> ({diaHora.picoDia.unidades} u.)
                {' | '}
                Pico por hora: <span className='font-semibold text-slate-800'>{String(diaHora.picoHora.hora).padStart(2, '0')}:00</span> ({diaHora.picoHora.unidades} u.)
              </p>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <div>
                <p className='text-xs font-semibold text-slate-600 mb-3'>Unidades por día de la semana</p>
                <div className='space-y-2'>
                  {diaHora.ventasPorDia.map((item) => (
                    <div key={item.dia} className='flex items-center gap-3'>
                      <span className='w-20 text-xs font-semibold text-slate-600'>{item.dia.slice(0, 3)}</span>
                      <div className='flex-1 h-5 bg-slate-100 rounded overflow-hidden'>
                        <div
                          className='h-full bg-linear-to-r from-blue-500 to-blue-600'
                          style={{ width: `${(item.unidades / maxUnidadesDia) * 100}%` }}
                        ></div>
                      </div>
                      <span className='w-14 text-right text-xs font-bold text-slate-800'>{item.unidades} u.</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className='text-xs font-semibold text-slate-600 mb-3'>Unidades por hora (24h)</p>
                <div className='grid grid-cols-6 gap-2'>
                  {diaHora.ventasPorHora.map((item) => (
                    <div key={item.hora} className='rounded-lg border border-slate-200 p-2 bg-slate-50'>
                      <p className='text-[10px] text-slate-500 mb-1'>{String(item.hora).padStart(2, '0')}:00</p>
                      <div className='h-2 bg-slate-200 rounded overflow-hidden'>
                        <div
                          className='h-full bg-blue-600'
                          style={{ width: `${(item.unidades / maxUnidadesHora) * 100}%` }}
                        ></div>
                      </div>
                      <p className='text-[10px] font-semibold text-slate-700 mt-1'>{item.unidades} u.</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        

        
        </div>
      </div>
    </section>
  )
}

export default Dashboard


