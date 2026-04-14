import { useEffect, useState } from 'react'

function Inventario({ products, loading, error, onRefresh, onUpdateStock }) {
  const [draftStocks, setDraftStocks] = useState({})
  const [savingId, setSavingId] = useState(null)
  const formatMoney = (amount) => `$${Number(amount).toFixed(2)}`

  useEffect(() => {
    const nextDrafts = {}

    for (const product of products) {
      nextDrafts[product.id] = String(product.stock)
    }

    setDraftStocks(nextDrafts)
  }, [products])

  const handleStockChange = (productId, value) => {
    setDraftStocks((prev) => ({
      ...prev,
      [productId]: value,
    }))
  }

  const handleSave = async (product) => {
    const nextStock = Number(draftStocks[product.id])

    if (Number.isNaN(nextStock) || nextStock < 0) {
      return
    }

    setSavingId(product.id)

    try {
      await onUpdateStock(product, nextStock)
      await onRefresh()
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className='h-full flex flex-col gap-4 overflow-hidden'>
      <header className='shrink-0 flex items-center justify-between'>


        <button
          className='h-10 px-4 rounded-xl bg-blue-800 text-white font-semibold hover:bg-blue-900 transition-colors duration-150 disabled:opacity-60'
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </header>

      {error && (
        <div className='bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3'>
          {error}
        </div>
      )}

      <div className='bg-white rounded-xl border border-slate-300 overflow-hidden flex flex-col flex-1 min-h-0'>
        <div className='grid grid-cols-[80px_1fr_120px_150px] px-5 py-3 text-xs text-slate-500 bg-slate-100 font-semibold tracking-wide shrink-0'>
          <p>ID</p>
          <p>PRODUCTO</p>
          <p>PRECIO</p>
          <p>STOCK</p>
        </div>

        <div className='overflow-y-auto flex-1'>
        {products.map((product) => (
          <div
            key={product.id}
            className='grid grid-cols-[80px_1fr_120px_150px] px-5 py-3 border-t border-slate-200 items-center gap-3'
          >
            <p className='text-slate-600'>{product.id}</p>
            <p className='text-slate-900 font-medium'>{product.nombre}</p>
            <p className='text-blue-800 font-semibold'>{formatMoney(product.precio)}</p>
            <div className='flex items-center gap-2'>
              <input
                type='number'
                min='0'
                value={draftStocks[product.id] ?? product.stock}
                onChange={(event) => handleStockChange(product.id, event.target.value)}
                className='w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500'
              />
              <button
                className='h-9 px-3 rounded-lg bg-blue-800 text-white text-sm font-semibold hover:bg-blue-900 transition-colors duration-150 disabled:opacity-60'
                onClick={() => handleSave(product)}
                disabled={savingId === product.id || Number(draftStocks[product.id]) === Number(product.stock)}
              >
                {savingId === product.id ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ))}

        {!loading && products.length === 0 && (
          <div className='px-5 py-8 text-center text-slate-500 border-t border-slate-200'>
            No hay productos para mostrar.
          </div>
        )}
        </div>
      </div>
    </section>
  )
}

export default Inventario
