function Reportes({ salesHistory }) {
  const totalsByMethod = salesHistory.reduce((acc, sale) => {
    if (!acc[sale.paymentMethod]) {
      acc[sale.paymentMethod] = { count: 0, amount: 0 }
    }

    acc[sale.paymentMethod].count += 1
    acc[sale.paymentMethod].amount += sale.total
    return acc
  }, {})

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

      <div className='grid grid-cols-2 gap-4 shrink-0'>
        <div className='bg-white rounded-xl border border-slate-300 p-4'>
          <p className='text-sm text-slate-500 mb-1'>Total de ventas registradas</p>
          <p className='text-3xl font-bold text-slate-900'>{salesHistory.length}</p>
        </div>

        <div className='bg-white rounded-xl border border-slate-300 p-4'>
          <p className='text-sm text-slate-500 mb-1'>Monto total vendido</p>
          <p className='text-3xl font-bold text-blue-800'>
            {formatMoney(salesHistory.reduce((sum, sale) => sum + sale.total, 0))}
          </p>
        </div>
      </div>

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
