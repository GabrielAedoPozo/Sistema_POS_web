import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Menu from './components/Menu.jsx'
import Orden from './components/Orden.jsx'
import Reportes from './components/Reportes.jsx'
import Inventario from './components/Inventario.jsx'
import './styles/style.css'
import '@fontsource/onest/300.css';
import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';

const API_URL = 'http://localhost:3000'


function App() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [saleError, setSaleError] = useState('')
  const [orderItems, setOrderItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [activeSection, setActiveSection] = useState('ventas')
  const [salesHistory, setSalesHistory] = useState([])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    setProductsError('')

    try {
      const response = await fetch(`${API_URL}/productos`)
      if (!response.ok) {
        throw new Error('No se pudo obtener productos')
      }

      const data = await response.json()
      setProducts(data)
    } catch (error) {
      setProductsError(error.message || 'Error cargando inventario')
    } finally {
      setLoadingProducts(false)
    }
  }

  const fetchSalesHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/ventas`)

      if (!response.ok) {
        throw new Error('No se pudo obtener el historial de ventas')
      }

      const data = await response.json()
      setSalesHistory(data)
    } catch (error) {
      setSaleError(error.message || 'Error cargando reportes')
    }
  }

  const updateProductStock = async (product, nextStock) => {
    const response = await fetch(`${API_URL}/productos/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: product.nombre,
        precio: product.precio,
        stock: nextStock,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo actualizar el stock')
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchSalesHistory()
  }, [])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products

    return products.filter((product) => {
      return (
        product.nombre.toLowerCase().includes(term)
      )
    })
  }, [products, search])

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax

  const addProductToOrder = (product) => {
    setOrderItems((prev) => {
      const current = prev.find((item) => item.id === product.id)

      if (current) {
        if (current.qty >= Number(product.stock)) {
          return prev
        }

        return prev.map((item) => {
          if (item.id !== product.id) return item
          return { ...item, qty: item.qty + 1 }
        })
      }

      if (Number(product.stock) <= 0) {
        return prev
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.nombre,
          type: `Stock: ${product.stock}`,
          price: Number(product.precio),
          stock: Number(product.stock),
          qty: 1
        }
      ]
    })
  }

  const updateQty = (productId, delta) => {
    setOrderItems((prev) => {
      return prev
        .map((item) => {
          if (item.id !== productId) return item

          const nextQty = item.qty + delta
          if (delta > 0 && nextQty > item.stock) {
            return item
          }

          return { ...item, qty: item.qty + delta }
        })
        .filter((item) => item.qty > 0)
    })
  }

  const clearOrder = () => {
    setOrderItems([])
  }

  const handleNewSale = () => {
    setOrderItems([])
    setPaymentMethod('')
    setSearch('')
    setActiveSection('ventas')
  }

  const handleCheckout = () => {
    if (orderItems.length === 0 || !paymentMethod) return

    const sendSale = async () => {
      setSaleError('')

      try {
        const payload = {
          total,
          metodo_pago: paymentMethod,
          items: orderItems.map((item) => ({
            producto_id: item.id,
            cantidad: item.qty,
            precio: item.price
          }))
        }

        const response = await fetch(`${API_URL}/ventas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'No se pudo registrar la venta')
        }

        const sale = {
          id: data.ventaId,
          createdAt: new Date().toISOString(),
          paymentMethod,
          subtotal,
          tax,
          total,
          items: orderItems.map((item) => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
            price: item.price
          }))
        }

        setSalesHistory((prev) => [sale, ...prev])
        setOrderItems([])
        setPaymentMethod('')
        setProducts(Array.isArray(data.productos) ? data.productos : [])
        await fetchSalesHistory()
      } catch (error) {
        setSaleError(error.message || 'Error al cobrar la venta')
      }
    }

    sendSale()
  }

  const formatMoney = (amount) => `$${amount.toFixed(2)}`

  return (
    <div className='bg-slate-200 h-screen flex overflow-hidden'>
      <Menu
        onNewSale={handleNewSale}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <main className='flex-1 px-6 py-4 border-r border-slate-300 flex flex-col overflow-hidden min-w-0'>
        {activeSection === 'ventas' ? (
          <>
            <div className='flex items-center justify-between mb-3 shrink-0'>
              <div className='flex items-center gap-3'>
                <div className='bg-white rounded-xl px-4 py-2 text-sm min-w-55 flex items-center'>
                  <i className='fa-solid fa-magnifying-glass mr-2'></i>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder='Buscar producto...'
                    className='w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400'
                  />
                </div>
              </div>
            </div>

            {saleError && (
              <div className='mb-3 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3'>
                {saleError}
              </div>
            )}

            {productsError && (
              <div className='mb-3 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3'>
                {productsError}
              </div>
            )}

            <div className='bg-white border border-slate-300 rounded-xl overflow-hidden'>
              <div className='grid grid-cols-[1fr_110px] px-5 py-2 text-xs text-slate-500 bg-slate-100 font-semibold tracking-wide'>
                <p>PRODUCT NAME</p>
                <p>PRICE</p>
              </div>

              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={`grid grid-cols-[1fr_110px] px-5 py-2.5 border-t border-slate-200 items-center ${
                    index === 1 ? 'bg-slate-100' : 'bg-white'
                  }`}
                >
                  <div>
                    <p className='text-base text-slate-900'>{product.nombre}</p>
                    <p className='text-xs text-slate-500'>Stock: {product.stock}</p>
                  </div>
                  <div className='text-blue-800 font-semibold flex items-center justify-between'>
                    <span>{formatMoney(Number(product.precio))}</span>
                    <button
                      className='text-blue-800 hover:text-blue-900 disabled:opacity-40'
                      onClick={() => addProductToOrder(product)}
                      aria-label={`Agregar ${product.nombre}`}
                      disabled={Number(product.stock) <= 0}
                    >
                      <i className='fa-solid fa-circle-plus'></i>
                    </button>
                  </div>
                </div>
              ))}

              {!loadingProducts && filteredProducts.length === 0 && (
                <div className='px-5 py-8 text-center text-slate-500 border-t border-slate-200'>
                  No se encontraron productos.
                </div>
              )}

              {loadingProducts && (
                <div className='px-5 py-8 text-center text-slate-500 border-t border-slate-200'>
                  Cargando productos...
                </div>
              )}
            </div>
          </>
        ) : activeSection === 'inventario' ? (
          <Inventario
            products={products}
            loading={loadingProducts}
            error={productsError}
            onRefresh={fetchProducts}
            onUpdateStock={updateProductStock}
          />
        ) : (
          <Reportes salesHistory={salesHistory} />
        )}
      </main>

      <Orden
        orderItems={orderItems}
        subtotal={subtotal}
        tax={tax}
        total={total}
        paymentMethod={paymentMethod}
        onPaymentSelect={setPaymentMethod}
        onUpdateQty={updateQty}
        onClearOrder={clearOrder}
        onCheckout={handleCheckout}
        disabled={activeSection !== 'ventas'}
      />
    </div>
  )
}

export default App
