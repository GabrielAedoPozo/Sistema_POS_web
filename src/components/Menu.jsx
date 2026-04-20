function Menu({ onNewSale, activeSection, onSectionChange, canManageInventory, sessionRoleLabel }) {
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

      <div className='mt-auto shrink-0 space-y-3'>
        <div className='rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-4 py-3 shadow-[0_6px_18px_rgba(14,116,144,0.12)]'>
          <p className='text-[10px] uppercase tracking-[0.18em] text-sky-600 font-semibold'>Sesion activa</p>
          <div className='mt-1 flex items-center gap-2'>
            <span className='inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100' aria-hidden='true'></span>
            <p className='text-sm font-semibold text-slate-800'>{sessionRoleLabel}</p>
          </div>
          <p className='text-xs text-slate-500 mt-1'>Cuenta conectada en este terminal.</p>
        </div>

        <button
          className="w-full bg-blue-800 text-white rounded-xl h-11 font-semibold hover:bg-blue-900 transition-colors duration-150"
          onClick={onNewSale}
        >
          <i className="fa-solid fa-plus mr-2"></i>
          Nueva Venta
        </button>
      </div>
    </aside>
  )
}

export default Menu