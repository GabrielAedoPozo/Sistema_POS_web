function Menu({ onNewSale, activeSection, onSectionChange, canManageInventory }) {
  const dashboardActive = activeSection === 'dashboard'
  const salesActive = activeSection === 'ventas'
  const inventoryActive = activeSection === 'inventario'
  const reportsActive = activeSection === 'reportes'

  return (
    <aside className="w-[350px] h-screen border-r border-slate-300 bg-slate-100 px-4 py-5 flex flex-col overflow-hidden">
        <div className=" shrink-0">
          <img src="/img/gap-logo-oficial.png" className="h-40" alt="" />
        </div>
      
      <div className="flex flex-col gap-2 text-sm shrink-0 mt-10 gap-4">
        <button
          className={`h-12 rounded-xl px-4 flex items-center gap-3 font-semibold text-[1.4rem] tracking-wide ${
            salesActive ? 'bg-blue-100 text-blue-800' : 'text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => onSectionChange('ventas')}
          
        >
          <i className="fa-solid fa-cash-register"></i>
          Ventas
        </button>
        <button
          className={`h-12 rounded-xl px-4 flex items-center gap-3 font-semibold text-[1.4rem] tracking-wide ${
            dashboardActive ? 'bg-blue-100 text-blue-800' : 'text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => onSectionChange('dashboard')}
        >
          <i className="fa-solid fa-gauge"></i>
          Dashboard
        </button>
        <button
          className={`h-12 rounded-xl px-4 flex items-center justify-between font-semibold text-[1.4rem] tracking-wide transition-colors duration-150 ${
            inventoryActive ? 'bg-blue-100 text-blue-800' : 'text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => onSectionChange('inventario')}
        >
          <span className='flex items-center gap-3'>
            <i className="fa-solid fa-box"></i>
            Inventario
          </span>
          {!canManageInventory && <i className='fa-solid fa-lock text-xs text-slate-500' title='Solo admin puede editar' />}
        </button>
        <button
          className={`h-12 rounded-xl px-4 flex items-center gap-3 font-semibold text-[1.4rem] tracking-wide transition-colors duration-150 ${
            reportsActive ? 'bg-blue-100 text-blue-800' : 'text-slate-700 hover:bg-slate-200'
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