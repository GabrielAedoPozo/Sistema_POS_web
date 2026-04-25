import { useEffect, useState } from 'react'

function Inventario({ products, loading, error, onRefresh, onUpdateProduct, canManageInventory }) {
  const [draftStocks, setDraftStocks] = useState({})
  const [draftPurchasePrices, setDraftPurchasePrices] = useState({})
  const [draftSalePrices, setDraftSalePrices] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const nextDrafts = {}

    for (const product of products) {
      nextDrafts[product.id] = String(product.stock)
    }

    setDraftStocks(nextDrafts)

    const nextPurchasePriceDrafts = {}
    const nextSalePriceDrafts = {}

    for (const product of products) {
      nextPurchasePriceDrafts[product.id] = Number(product.precio_compra ?? 0).toFixed(2)
      nextSalePriceDrafts[product.id] = Number(product.precio_venta ?? product.precio ?? 0).toFixed(2)
    }

    setDraftPurchasePrices(nextPurchasePriceDrafts)
    setDraftSalePrices(nextSalePriceDrafts)
  }, [products])

  const handleStockChange = (productId, value) => {
    setDraftStocks((prev) => ({
      ...prev,
      [productId]: value,
    }))
  }

  const handlePurchasePriceChange = (productId, value) => {
    setDraftPurchasePrices((prev) => ({
      ...prev,
      [productId]: value,
    }))
  }

  const handleSalePriceChange = (productId, value) => {
    setDraftSalePrices((prev) => ({
      ...prev,
      [productId]: value,
    }))
  }

  const handleSave = async (product) => {
    if (!canManageInventory) return

    const nextStock = Number(draftStocks[product.id])
    const nextPurchasePrice = Number(draftPurchasePrices[product.id])
    const nextSalePrice = Number(draftSalePrices[product.id])

    if (
      Number.isNaN(nextStock) ||
      nextStock < 0 ||
      Number.isNaN(nextPurchasePrice) ||
      nextPurchasePrice < 0 ||
      Number.isNaN(nextSalePrice) ||
      nextSalePrice < 0
    ) {
      return
    }

    setSavingId(product.id)

    try {
      await onUpdateProduct(product, {
        stock: nextStock,
        precio_compra: Number(nextPurchasePrice.toFixed(2)),
        precio_venta: Number(nextSalePrice.toFixed(2)),
      })
      await onRefresh()
    } finally {
      setSavingId(null)
    }
  }

  // Filtrar productos por búsqueda
  const filteredProducts = products.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toString().includes(searchTerm)
  )

  return (
    <section className='h-full flex flex-col gap-4 overflow-hidden'>
      <header className='shrink-0 flex items-center justify-between gap-3'>
        <input
          type='text'
          placeholder='Buscar producto por nombre o ID...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='flex-1 h-10 px-4 rounded-xl border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm'
        />

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

      {!canManageInventory && (
        <div className='bg-amber-50 text-amber-800 border border-amber-200 rounded-xl px-4 py-3 text-sm'>
          Modo solo lectura: solo un admin puede editar precio de compra, precio de venta y stock.
        </div>
      )}

      <div className='bg-white rounded-xl border border-slate-300 overflow-hidden flex flex-col flex-1 min-h-0'>
        <div className='grid grid-cols-[70px_1fr_140px_140px_170px] px-5 py-3 text-xs text-slate-500 bg-slate-100 font-semibold tracking-wide shrink-0'>
          <p>ID</p>
          <p>PRODUCTO</p>
          <p>P. COMPRA</p>
          <p>P. VENTA</p>
          <p>STOCK</p>
        </div>

        <div className='overflow-y-auto flex-1'>
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className='grid grid-cols-[70px_1fr_140px_140px_170px] px-5 py-3 border-t border-slate-200 items-center gap-3 hover:bg-slate-50 transition-colors'
            >
              <p className='text-slate-600 text-sm'>{product.id}</p>
              <p className='text-slate-900 font-medium text-sm'>{product.nombre}</p>

              <input
                type='number'
                min='0'
                step='0.01'
                value={draftPurchasePrices[product.id] ?? product.precio_compra ?? 0}
                onChange={(event) => handlePurchasePriceChange(product.id, event.target.value)}
                className='w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed'
                disabled={!canManageInventory}
                aria-label={`Precio de compra de ${product.nombre}`}
              />

              <input
                type='number'
                min='0'
                step='0.01'
                value={draftSalePrices[product.id] ?? product.precio_venta ?? product.precio ?? 0}
                onChange={(event) => handleSalePriceChange(product.id, event.target.value)}
                className='w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed'
                disabled={!canManageInventory}
                aria-label={`Precio de venta de ${product.nombre}`}
              />

              <div className='flex items-center gap-2'>
                <input
                  type='number'
                  min='0'
                  value={draftStocks[product.id] ?? product.stock}
                  onChange={(event) => handleStockChange(product.id, event.target.value)}
                  className='w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed'
                  disabled={!canManageInventory}
                />
                <button
                  className='h-9 px-3 rounded-lg bg-blue-800 text-white text-sm font-semibold hover:bg-blue-900 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed'
                  onClick={() => handleSave(product)}
                  disabled={
                    !canManageInventory ||
                    savingId === product.id ||
                    (
                      Number(draftStocks[product.id]) === Number(product.stock) &&
                      Number(draftPurchasePrices[product.id]) === Number(product.precio_compra ?? 0) &&
                      Number(draftSalePrices[product.id]) === Number(product.precio_venta ?? product.precio ?? 0)
                    )
                  }
                >
                  {savingId === product.id ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ))}

          {!loading && filteredProducts.length === 0 && (
            <div className='px-5 py-8 text-center text-slate-500 border-t border-slate-200'>
              {searchTerm ? 'No se encontraron productos.' : 'No hay productos para mostrar.'}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Inventario
