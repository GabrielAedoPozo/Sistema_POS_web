function Menu() {
  return (

    <div className="w-100 h-229 border-2 border-gray-300 ">

        <div className="text-3xl mt-10 ml-10">
          <h2>Sistema POS</h2>
        </div>
      
      <div className="flex flex-col gap-5 mt-20 text-3xl ml-6">
        <div className="h-15 rounded-2xl px-3 flex items-center justify-start transition-all duration-200 cursor-pointer hover:bg-gray-300 "><p><i class="fa-solid fa-cash-register"></i> Ventas</p></div>
        <div className="h-15 rounded-2xl px-3 flex items-center justify-start transition-all duration-200 cursor-pointer hover:bg-gray-300 "><p><i class="fa-solid fa-box"></i> Inventario</p></div>
        <div className="h-15 rounded-2xl px-3 flex items-center justify-start transition-all duration-200 cursor-pointer hover:bg-gray-300 "><p><i class="fa-solid fa-arrow-trend-down"></i> Reportes</p></div>
      </div>

    </div>
  )
}

export default Menu