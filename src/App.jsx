import { useMemo, useState } from 'react'
import './App.css'
import Menu from './components/Menu.jsx'
import Orden from './components/Orden.jsx'
import Reportes from './components/Reportes.jsx'
import './styles/style.css'
import '@fontsource/onest/300.css';
import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';



function App() {
  const products = [
    { id: 1, name: 'Producto 1', type: 'Caffe • Best Seller', price: 4.5 },
    { id: 2, name: 'Producto 2', type: 'Pastry', price: 6.25 },
    { id: 3, name: 'Producto 3', type: 'Cold Brew', price: 5.75 },
    { id: 4, name: 'Producto 4', type: 'Pastry', price: 12 },
    { id: 5, name: 'Producto 5', type: 'Caffe • 250g', price: 18.5 },
    { id: 6, name: 'Producto 6', type: 'Caffe', price: 3 },
    { id: 7, name: 'Producto 7', type: 'Caffe', price: 4.25 },
    { id: 8, name: 'Producto 8', type: 'Bakery', price: 3.5 },
    { id: 9, name: 'Producto 9', type: 'Tea', price: 3.75 },
    { id: 10, name: 'Producto 10', type: 'Bakery', price: 4 },
    { id: 11, name: 'Producto 11', type: 'Cold Brew', price: 3.25 }
  ]

  const [search, setSearch] = useState('')
  const [orderItems, setOrderItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [activeSection, setActiveSection] = useState('ventas')
  const [salesHistory, setSalesHistory] = useState([])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(term) ||
        product.type.toLowerCase().includes(term)
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
        return prev.map((item) => {
          if (item.id !== product.id) return item
          return { ...item, qty: item.qty + 1 }
        })
      }

      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (productId, delta) => {
    setOrderItems((prev) => {
      return prev
        .map((item) => {
          if (item.id !== productId) return item
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

    const sale = {
      id: Date.now(),
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
                <div className='bg-white rounded-xl px-4 py-2 text-sm min-w-[220px] flex items-center'>
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
                    <p className='text-base text-slate-900'>{product.name}</p>
                    <p className='text-xs text-slate-500'>{product.type}</p>
                  </div>
                  <div className='text-blue-800 font-semibold flex items-center justify-between'>
                    <span>{formatMoney(product.price)}</span>
                    <button
                      className='text-blue-800 hover:text-blue-900'
                      onClick={() => addProductToOrder(product)}
                      aria-label={`Agregar ${product.name}`}
                    >
                      <i className='fa-solid fa-circle-plus'></i>
                    </button>
                  </div>
                </div>
              ))}

              {filteredProducts.length === 0 && (
                <div className='px-5 py-8 text-center text-slate-500 border-t border-slate-200'>
                  No se encontraron productos.
                </div>
              )}
            </div>
          </>
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
