function Menu({ onNewSale, activeSection, onSectionChange }) {
  const salesActive = activeSection === 'ventas'
  const reportsActive = activeSection === 'reportes'

  return (
    <aside className="w-[230px] h-screen border-r border-slate-300 bg-slate-100 px-4 py-5 flex flex-col overflow-hidden">
        <div className="mb-8 shrink-0">
          <h2 className="font-bold text-2xl text-slate-800">SISTEMA POS</h2>
          <p className="text-xs tracking-[0.2em] text-slate-500">TERMINAL #01</p>
        </div>
      
      <div className="flex flex-col gap-2 text-sm shrink-0">
        <button
          className={`h-11 rounded-xl px-4 flex items-center gap-3 font-semibold ${
            salesActive ? 'bg-blue-100 text-blue-800' : 'text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => onSectionChange('ventas')}
        >
          <i className="fa-solid fa-cash-register"></i>
          Ventas
        </button>
        <button className="h-11 rounded-xl px-4 flex items-center gap-3 text-slate-700 hover:bg-slate-200 transition-colors duration-150">
          <i className="fa-solid fa-box"></i>
          Inventario
        </button>
        <button
          className={`h-11 rounded-xl px-4 flex items-center gap-3 transition-colors duration-150 ${
            reportsActive ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => onSectionChange('reportes')}
        >
          <i className="fa-solid fa-chart-column"></i>
          Reportes 
        </button>
      </div>

      <button
        className="mt-auto bg-blue-800 text-white rounded-xl h-11 font-semibold hover:bg-blue-900 transition-colors duration-150 shrink-0"
        onClick={onNewSale}
      >
        <i className="fa-solid fa-plus mr-2"></i>
        Nueva Venta
      </button>
    </aside>
  )
}

export default Menu