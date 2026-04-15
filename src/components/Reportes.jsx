function Reportes({ salesHistory }) {
  // Análisis por método de pago
  const totalsByMethod = salesHistory.reduce((acc, sale) => {
    if (!acc[sale.paymentMethod]) {
      acc[sale.paymentMethod] = { count: 0, amount: 0 }
    }

    acc[sale.paymentMethod].count += 1
    acc[sale.paymentMethod].amount += sale.total
    return acc
  }, {})

  // Análisis por producto
  const productAnalysis = salesHistory.reduce((acc, sale) => {
    sale.items.forEach((item) => {
      if (!acc[item.name]) {
        acc[item.name] = { qty: 0, total: 0, id: item.id }
      }
      acc[item.name].qty += item.qty
      acc[item.name].total += item.price * item.qty
    })
    return acc
  }, {})

  // Obtener producto más vendido
  const topProduct = Object.entries(productAnalysis)
    .sort(([, a], [, b]) => b.qty - a.qty)[0]

  // Análisis por día de la semana
  const salesByDayOfWeek = salesHistory.reduce((acc, sale) => {
    const date = new Date(sale.createdAt)
    const dayOfWeek = date.getDay()
    const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]

    if (!acc[dayName]) {
      acc[dayName] = { count: 0, items: {} }
    }
    acc[dayName].count += 1

    sale.items.forEach((item) => {
      if (!acc[dayName].items[item.name]) {
        acc[dayName].items[item.name] = 0
      }
      acc[dayName].items[item.name] += item.qty
    })

    return acc
  }, {})

  // Análisis por día (últimos 30 días)
  const salesByDate = salesHistory.reduce((acc, sale) => {
    const date = new Date(sale.createdAt)
    const dateStr = date.toLocaleDateString('es-PE')

    if (!acc[dateStr]) {
      acc[dateStr] = { count: 0, items: {} }
    }
    acc[dateStr].count += 1

    sale.items.forEach((item) => {
      if (!acc[dateStr].items[item.name]) {
        acc[dateStr].items[item.name] = 0
      }
      acc[dateStr].items[item.name] += item.qty
    })

    return acc
  }, {})

  // Calcular predicciones
  const calculatePredictions = () => {
    const predictions = []
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][tomorrow.getDay()]

    // Para cada producto, calcular promedio
    Object.entries(productAnalysis).forEach(([productName, { qty }]) => {
      // Promedio total de ventas del producto
      const avgDaily = salesHistory.length > 0 ? (qty / Math.max(Object.keys(salesByDate).length, 1)).toFixed(0) : 0

      // Promedio por día de la semana
      const tomorrowData = salesByDayOfWeek[tomorrowDayName]
      const tomorrowAvg = tomorrowData && tomorrowData.items[productName]
        ? Math.round(tomorrowData.items[productName] / Math.max(Object.values(salesByDayOfWeek).filter(d => d.items[productName]).length, 1))
        : Math.round(avgDaily)

      if (tomorrowAvg > 0) {
        predictions.push({
          type: 'venta',
          product: productName,
          prediction: tomorrowAvg,
          message: `Mañana venderás ~${tomorrowAvg} ${productName}${tomorrowAvg > 1 ? 's' : ''}`
        })
      }
    })

    return predictions.sort((a, b) => b.prediction - a.prediction).slice(0, 5)
  }

  const predictions = calculatePredictions()

  const formatMoney = (amount) => `$${amount.toFixed(2)}`
  const formatDate = (isoDate) => {
    return new Date(isoDate).toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  const paymentSummary = Object.entries(totalsByMethod)

  return (
    <section className='h-full flex flex-col gap-4 overflow-hidden'>

      <div className='grid grid-cols-4 gap-4 shrink-0'>
        <div className='bg-white rounded-xl border border-slate-300 p-4'>
          <p className='text-sm text-slate-500 mb-1'>Total de ventas</p>
          <p className='text-3xl font-bold text-slate-900'>{salesHistory.length}</p>
        </div>

        <div className='bg-white rounded-xl border border-slate-300 p-4'>
          <p className='text-sm text-slate-500 mb-1'>Monto total vendido</p>
          <p className='text-3xl font-bold text-blue-800'>
            {formatMoney(salesHistory.reduce((sum, sale) => sum + sale.total, 0))}
          </p>
        </div>

        <div className='bg-white rounded-xl border border-slate-300 p-4'>
          <p className='text-sm text-slate-500 mb-1'>Producto más vendido</p>
          <p className='text-lg font-bold text-slate-900'>
            {topProduct ? topProduct[0] : 'N/A'}
          </p>
          <p className='text-sm text-slate-600 mt-1'>
            {topProduct ? `${topProduct[1].qty} unidades` : ''}
          </p>
        </div>

        <div className='bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-orange-200 p-4'>
          <p className='text-sm text-orange-700 mb-1 font-semibold'>⚡ Trending</p>
          <p className='text-lg font-bold text-orange-800'>
            {predictions.length > 0 ? predictions[0].product : 'N/A'}
          </p>
          <p className='text-xs text-orange-700 mt-1'>
            {predictions.length > 0 ? `~${predictions[0].prediction} mañana` : 'Sin datos'}
          </p>
        </div>
      </div>

      {/* Predicciones y Alertas */}
      <div className='grid grid-cols-2 gap-4 shrink-0'>
        <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4'>
          <h3 className='font-semibold text-blue-900 mb-3 flex items-center gap-2'>
            <i className='fa-solid fa-crystal-ball'></i>
            Predicciones para Mañana
          </h3>
          <div className='space-y-2'>
            {predictions.length === 0 ? (
              <p className='text-sm text-blue-700'>Aún no hay datos para predicciones</p>
            ) : (
              predictions.map((pred, idx) => (
                <div key={idx} className='bg-white bg-opacity-60 rounded-lg p-2'>
                  <p className='text-sm text-blue-900'>
                    <span className='font-semibold'>{pred.product}:</span> ~{pred.prediction} unidades
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className='bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-300 p-4'>
          <h3 className='font-semibold text-slate-900 mb-3 flex items-center gap-2'>
            <i className='fa-solid fa-chart-line'></i>
            Top Productos
          </h3>
          <div className='space-y-2'>
            {Object.entries(productAnalysis)
              .sort(([, a], [, b]) => b.qty - a.qty)
              .slice(0, 5)
              .map(([name, data], idx) => (
                <div key={idx} className='flex items-center justify-between text-sm bg-white bg-opacity-60 rounded-lg p-2'>
                  <span className='text-slate-700'>{idx + 1}. {name}</span>
                  <span className='font-semibold text-slate-900'>{data.qty} u.</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Historial y Métodos de Pago */}
      <div className='grid grid-cols-[1.3fr_1fr] gap-4 flex-1 min-h-0'>
        <div className='bg-white rounded-xl border border-slate-300 overflow-hidden flex flex-col min-h-0'>
          <div className='px-4 py-3 bg-slate-100 border-b border-slate-300'>
            <h2 className='font-semibold text-slate-800'>Historial de Ventas</h2>
          </div>

          <div className='overflow-y-auto min-h-0'>
            {salesHistory.length === 0 && (
              <div className='p-6 text-center text-slate-500'>Aun no hay ventas cobradas.</div>
            )}

            {salesHistory.map((sale) => (
              <div key={sale.id} className='px-4 py-3 border-b border-slate-200'>
                <div className='flex items-center justify-between mb-1'>
                  <p className='font-semibold text-slate-900'>Venta #{sale.id}</p>
                  <p className='text-sm text-slate-500'>{formatDate(sale.createdAt)}</p>
                </div>

                <div className='flex items-center justify-between text-sm'>
                  <p className='text-slate-700'>Metodo: {sale.paymentMethod}</p>
                  <p className='font-semibold text-blue-800'>{formatMoney(sale.total)}</p>
                </div>

                <p className='text-xs text-slate-500 mt-1'>
                  Productos: {sale.items.reduce((sum, item) => sum + item.qty, 0)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className='bg-white rounded-xl border border-slate-300 overflow-hidden flex flex-col'>
          <div className='px-4 py-3 bg-slate-100 border-b border-slate-300'>
            <h2 className='font-semibold text-slate-800'>Ventas por Metodo de Pago</h2>
          </div>

          <div className='p-4 space-y-3'>
            {paymentSummary.length === 0 && (
              <p className='text-sm text-slate-500'>No hay datos para mostrar.</p>
            )}

            {paymentSummary.map(([method, stats]) => (
              <div key={method} className='rounded-lg border border-slate-200 p-3'>
                <p className='font-semibold text-slate-800'>{method}</p>
                <p className='text-sm text-slate-600'>Cantidad de ventas: {stats.count}</p>
                <p className='text-sm text-slate-600'>Total vendido: {formatMoney(stats.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Reportes
