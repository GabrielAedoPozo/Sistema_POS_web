import './App.css'
import Menu from './components/Menu.jsx'
import Orden from './components/Orden.jsx'
import './styles/style.css'
import '@fontsource/onest/300.css';
import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';



function App() {
  const products = [
    { name: 'Artisan Latte', type: 'Caffe • Best Seller', price: '$4.50' },
    { name: 'Midnight Cocoa', type: 'Pastry', price: '$6.25' },
    { name: 'Emerald Matcha', type: 'Cold Brew', price: '$5.75' },
    { name: 'Petite Macaron Set', type: 'Pastry', price: '$12.00' },
    { name: 'Ethiopian Roast (Whole Bean)', type: 'Caffe • 250g', price: '$18.50' },
    { name: 'Double Espresso', type: 'Caffe', price: '$3.00' },
    { name: 'Flat White', type: 'Caffe', price: '$4.25' },
    { name: 'Classic Croissant', type: 'Bakery', price: '$3.50' },
    { name: 'Earl Grey Tea', type: 'Tea', price: '$3.75' },
    { name: 'Chocolate Muffin', type: 'Bakery', price: '$4.00' },
    { name: 'Iced Americano', type: 'Cold Brew', price: '$3.25' },
    { name: 'Caramel Macchiato', type: 'Caffe', price: '$5.25' }
  ]

  return (
    <div className='bg-slate-200 h-screen flex overflow-hidden'>
      <Menu />

      <main className='flex-1 px-6 py-4 border-r border-slate-300 flex flex-col overflow-hidden min-w-0'>
        <div className='flex items-center justify-between mb-3 shrink-0'>
          <div className='flex items-center gap-3'>
            <div className='bg-white rounded-xl px-4 py-2 text-slate-400 text-sm min-w-[220px]'>
              <i className='fa-solid fa-magnifying-glass mr-2'></i>
              Search
            </div>

          </div>
        </div>

        <div className='mb-3 shrink-0'>
          <h1 className='text-3xl font-semibold text-slate-900'>Catalogo Principal</h1>
          <p className='text-slate-500 text-sm'>Selecciona items para una transacción</p>
        </div>

        <div className='bg-white border border-slate-300 rounded-xl overflow-hidden flex-1 min-h-0'>
          <div className='grid grid-cols-[1fr_110px] px-5 py-2 text-xs text-slate-500 bg-slate-100 font-semibold tracking-wide'>
            <p>PRODUCT NAME</p>
            <p>PRICE</p>
          </div>

          {products.map((product, index) => (
            <div
              key={product.name}
              className={`grid grid-cols-[1fr_110px] px-5 py-2.5 border-t border-slate-200 items-center ${
                index === 1 ? 'bg-slate-100' : 'bg-white'
              }`}
            >
              <div>
                <p className='text-base text-slate-900'>{product.name}</p>
                <p className='text-xs text-slate-500'>{product.type}</p>
              </div>
              <div className='text-blue-800 font-semibold flex items-center justify-between'>
                <span>{product.price}</span>
                {index === 1 && <i className='fa-solid fa-circle-plus'></i>}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Orden />
    </div>
  )
}

export default App
