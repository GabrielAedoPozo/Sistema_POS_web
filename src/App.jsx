import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Menu from './components/Menu.jsx'
import Orden from './components/Orden.jsx'
import Reportes from './components/Reportes.jsx'
import Inventario from './components/Inventario.jsx'
import Dashboard from './components/Dashboard.jsx'
import { apiFetch } from './api.js'
import './styles/style.css'
import '@fontsource/onest/300.css';
import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';

const normalizarMensajeError = (error, fallback) => {
  const msg = String(error?.message || '').toLowerCase()

  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
    return 'No hay conexion con el backend. Inicia el servidor y vuelve a intentar.'
  }

  return error?.message || fallback
}

function App() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [saleError, setSaleError] = useState('')
  const [comprobanteMessage, setComprobanteMessage] = useState({ type: '', text: '' })
  const [orderItems, setOrderItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [customerDocument, setCustomerDocument] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [activeSection, setActiveSection] = useState('ventas')
  const [salesHistory, setSalesHistory] = useState([])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    setProductsError('')

    try {
      const response = await apiFetch('/api/productos')
      if (!response.ok) {
        throw new Error('No se pudo obtener productos')
      }

      const data = await response.json()
      setProducts(data)
    } catch (error) {
      setProductsError(normalizarMensajeError(error, 'Error cargando inventario'))
    } finally {
      setLoadingProducts(false)
    }
  }

  const fetchSalesHistory = async () => {
    try {
      const response = await apiFetch('/api/ventas')

      if (!response.ok) {
        throw new Error('No se pudo obtener el historial de ventas')
      }

      const data = await response.json()
      setSalesHistory(data)
    } catch (error) {
      setSaleError(normalizarMensajeError(error, 'Error cargando reportes'))
    }
  }

  const updateProductStock = async (product, nextStock) => {
    const response = await apiFetch(`/api/productos/${product.id}`, {
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
        product.nombre.toLowerCase().includes(term) ||
        String(product.id).includes(term)
      )
    })
  }, [products, search])

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0)
  const tax = subtotal * 0.18
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
    setCustomerDocument('')
    setCustomerName('')
  }

  const handleNewSale = () => {
    setOrderItems([])
    setPaymentMethod('')
    setCustomerDocument('')
    setCustomerName('')
    setComprobanteMessage({ type: '', text: '' })
    setSearch('')
    setActiveSection('ventas')
  }

  const descargarPdfDesdeBase64 = (base64, fileName) => {
    const limpio = base64.includes(',') ? base64.split(',')[1] : base64
    const bytes = atob(limpio)
    const array = new Uint8Array(bytes.length)

    for (let i = 0; i < bytes.length; i += 1) {
      array[i] = bytes.charCodeAt(i)
    }

    const blob = new Blob([array], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const descargarPdfApisunat = async (pdfValue, fileName) => {
    if (!pdfValue) {
      throw new Error('APISUNAT no devolvió el PDF de la boleta')
    }

    if (typeof pdfValue !== 'string') {
      throw new Error('Formato de PDF inválido recibido desde APISUNAT')
    }

    if (pdfValue.startsWith('http://') || pdfValue.startsWith('https://')) {
      const response = await fetch(pdfValue)
      if (!response.ok) {
        throw new Error('No se pudo descargar el PDF desde APISUNAT')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      return
    }

    descargarPdfDesdeBase64(pdfValue, fileName)
  }


  const handleCheckout = () => {
    if (orderItems.length === 0 || !paymentMethod) return

    const sendSale = async () => {
      setSaleError('')
      setComprobanteMessage({ type: '', text: '' })

      try {
        const trimmedDocument = customerDocument.trim()
        const trimmedName = customerName.trim()

        if (![8, 11].includes(trimmedDocument.length)) {
          throw new Error('El documento del cliente debe tener 8 dígitos (DNI) o 11 dígitos (RUC)')
        }

        if (!trimmedName) {
          throw new Error('Debes ingresar nombre o razón social del cliente')
        }

        const payload = {
          total,
          metodo_pago: paymentMethod,
          items: orderItems.map((item) => ({
            producto_id: item.id,
            cantidad: item.qty,
            precio: item.price
          }))
        }

        const response = await apiFetch('/api/ventas', {
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
        setProducts(Array.isArray(data.productos) ? data.productos : [])

        const comprobantePayload = {
          venta_id: data.ventaId,
          fecha_de_emision: new Date().toISOString().slice(0, 10),
          cliente_numero_de_documento: trimmedDocument,
          cliente_denominacion: trimmedName,
          items: orderItems.map((item) => ({
            descripcion: item.name,
            cantidad: item.qty,
            precio_unitario: item.price,
          })),
        }

        const comprobanteResponse = await apiFetch('/api/comprobante', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comprobantePayload),
        })

        const comprobanteData = await comprobanteResponse.json()

        if (!comprobanteResponse.ok) {
          const errorText = comprobanteData.error || 'La venta se registró, pero falló la emisión del comprobante'

          throw new Error(errorText)
        }

        const nombreArchivo = `${comprobanteData.documento || 'comprobante'}-${comprobanteData.serie || 'DOC'}-${comprobanteData.numero || data.ventaId}.pdf`
        await descargarPdfApisunat(comprobanteData.pdf, nombreArchivo)

        setComprobanteMessage({
          type: 'success',
          text: comprobanteData.message || 'Comprobante emitido y PDF descargado correctamente',
        })

        setOrderItems([])
        setPaymentMethod('')
        setCustomerDocument('')
        setCustomerName('')
        await fetchSalesHistory()
      } catch (error) {
        setComprobanteMessage({
          type: 'error',
          text: normalizarMensajeError(error, 'Error al emitir comprobante en APISUNAT'),
        })
        setSaleError(normalizarMensajeError(error, 'Error al cobrar la venta'))
      }
    }

    sendSale()
  }

  const formatMoney = (amount) => `S/ ${amount.toFixed(2)}`
  const showOrderPanel = activeSection === 'ventas'

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

            {comprobanteMessage.text && (
              <div
                className={`mb-3 rounded-xl px-4 py-3 border ${
                  comprobanteMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {comprobanteMessage.text}
              </div>
            )}

            {productsError && (
              <div className='mb-3 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3'>
                {productsError}
              </div>
            )}

            <div className='bg-white border border-slate-300 rounded-xl overflow-hidden flex flex-col flex-1 min-h-0'>
              <div className='grid grid-cols-[1fr_90px_110px] px-5 py-2 text-xs text-slate-500 bg-slate-100 font-semibold tracking-wide shrink-0'>
                <p>PRODUCT NAME</p>
                <p>ID</p>
                <p>PRICE</p>
              </div>

              <div className='overflow-y-auto flex-1'>
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={`grid grid-cols-[1fr_90px_110px] px-5 py-2.5 border-t border-slate-200 items-center ${
                    index === 1 ? 'bg-slate-100' : 'bg-white'
                  }`}
                >
                  <div>
                    <p className='text-base text-slate-900'>{product.nombre}</p>
                    <p className='text-xs text-slate-500'>Stock: {product.stock}</p>
                  </div>
                  <p className='text-blue-800 font-semibold text-sm'>#{product.id}</p>
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
        ) : activeSection === 'dashboard' ? (
          <Dashboard products={products} salesHistory={salesHistory} />
        ) : (
          <Reportes salesHistory={salesHistory} />
        )}
      </main>

      {showOrderPanel ? (
        <Orden
          orderItems={orderItems}
          subtotal={subtotal}
          tax={tax}
          total={total}
          paymentMethod={paymentMethod}
          customerDocument={customerDocument}
          customerName={customerName}
          onPaymentSelect={setPaymentMethod}
          onCustomerDocumentChange={setCustomerDocument}
          onCustomerNameChange={setCustomerName}
          onUpdateQty={updateQty}
          onClearOrder={clearOrder}
          onCheckout={handleCheckout}
          disabled={false}
        />
      ) : (
        <aside className='w-100 h-screen bg-slate-100 p-4 flex flex-col overflow-hidden border-l border-slate-300'>
          <div className='flex items-center justify-between mt-4 shrink-0'>
            <h2 className='text-3xl font-semibold text-slate-900'>Orden Actual</h2>
          </div>

          <div className='mt-5 flex-1 min-h-0 flex items-center justify-center'>
            <div className='w-full rounded-xl border border-slate-200 bg-white px-5 py-6 text-center'>
              <p className='text-base font-semibold text-slate-900 mb-1'>Esta sección se muestra solo en Ventas.</p>
              <p className='text-sm text-slate-500'>
                Cambia a Ventas para ver la orden, agregar productos y continuar con el cobro.
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

export default App
