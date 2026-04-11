function Orden(){
    return(
        <aside className="w-100 h-screen bg-slate-100 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mt-4 shrink-0">
                <h2 className="text-3xl font-semibold text-slate-900">Current Order</h2>
                <button className="text-red-700 text-sm font-semibold"><i className="fa-solid fa-trash mr-1"></i> Eliminar Orden</button>
            </div>

        

            <div className="mt-auto bg-white rounded-xl p-4 border border-slate-200 shrink-0">
                <div className="space-y-1 text-sm text-slate-600 mb-3">
                    <div className="flex justify-between"><span>Subtotal</span><span>$15.25</span></div>
                    <div className="flex justify-between"><span>Sales Tax (8%)</span><span>$1.22</span></div>
                </div>

                <div className="flex items-end justify-between mb-4">
                    <p className="text-2xl font-semibold text-slate-800">Total Amount</p>
                    <p className="text-4xl font-bold text-blue-800">$16.47</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm font-semibold text-slate-700">
                    <button className="h-14 rounded-xl bg-slate-200 hover:bg-slate-300 transition-colors duration-150">EFECTIVO</button>
                    <button className="h-14 rounded-xl bg-slate-200 hover:bg-slate-300 transition-colors duration-150">TARJETA</button>
                    <button className="h-14 rounded-xl bg-slate-200 hover:bg-slate-300 transition-colors duration-150">YAPE</button>
                    <button className="h-14 rounded-xl bg-slate-200 hover:bg-slate-300 transition-colors duration-150">PLIN</button>
                </div>

                <button className="w-full h-12 rounded-xl bg-blue-800 text-white font-semibold hover:bg-blue-900 transition-colors duration-150">
                    <i className="fa-solid fa-receipt mr-2"></i>
                    Imprimir Boleta / Cobrar
                </button>
            </div>
        </aside>
    )
}

export default Orden