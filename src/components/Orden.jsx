function Orden({
    orderItems,
    subtotal,
    tax,
    total,
    paymentMethod,
    customerDocument,
    customerName,
    onPaymentSelect,
    onCustomerDocumentChange,
    onCustomerNameChange,
    onUpdateQty,
    onClearOrder,
    onCheckout,
    disabled
}){
    const paymentMethods = ['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN']
    const formatMoney = (amount) => `$${amount.toFixed(2)}`

    return(
        <aside className="w-100 h-screen bg-slate-100 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mt-4 shrink-0">
                <h2 className="text-3xl font-semibold text-slate-900">Orden Actual</h2>
                <button className="text-red-700 text-sm font-semibold disabled:opacity-50" onClick={onClearOrder} disabled={disabled}><i className="fa-solid fa-trash mr-1"></i> Eliminar Orden</button>
            </div>

            <div className="mt-5 flex-1 min-h-0 overflow-y-auto pr-1">
                {orderItems.length === 0 && (
                    <div className="h-full rounded-xl border border-dashed border-slate-300 text-slate-500 flex items-center justify-center text-sm bg-white">
                        No hay productos en la orden.
                    </div>
                )}

                <div className="space-y-3">
                    {orderItems.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl p-3 border border-slate-200">
                            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500 mb-2">{item.type}</p>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <button className="w-6 h-6 rounded bg-slate-200 disabled:opacity-50" onClick={() => onUpdateQty(item.id, -1)} disabled={disabled}>-</button>
                                    <span>{item.qty}</span>
                                    <button className="w-6 h-6 rounded bg-blue-700 text-white disabled:opacity-50" onClick={() => onUpdateQty(item.id, 1)} disabled={disabled}>+</button>
                                </div>

                                <span className="text-sm font-semibold text-slate-800">{formatMoney(item.price * item.qty)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-auto bg-white rounded-xl p-4 border border-slate-200 shrink-0">
                <div className="space-y-1 text-sm text-slate-600 mb-3">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
                    <div className="flex justify-between"><span>IGV (18%)</span><span>{formatMoney(tax)}</span></div>
                </div>

                <div className="flex items-end justify-between mb-4">
                    <p className="text-2xl font-semibold text-slate-800">Monto Total</p>
                    <p className="text-4xl font-bold text-blue-800">{formatMoney(total)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm font-semibold text-slate-700">
                    {paymentMethods.map((method) => (
                        <button
                            key={method}
                            className={`h-14 rounded-xl transition-colors duration-150 ${
                                paymentMethod === method
                                    ? 'bg-blue-700 text-white'
                                    : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                            onClick={() => onPaymentSelect(method)}
                            disabled={disabled}
                        >
                            {method}
                        </button>
                    ))}
                </div>

                <div className="space-y-2 mb-3">
                    <input
                        className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                        placeholder="Documento cliente (DNI o RUC)"
                        value={customerDocument}
                        onChange={(event) => onCustomerDocumentChange(event.target.value)}
                        disabled={disabled}
                    />
                    <input
                        className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                        placeholder="Nombre / Razón social"
                        value={customerName}
                        onChange={(event) => onCustomerNameChange(event.target.value)}
                        disabled={disabled}
                    />
                </div>

                <button
                    className="w-full h-12 rounded-xl bg-blue-800 text-white font-semibold hover:bg-blue-900 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={onCheckout}
                    disabled={disabled || orderItems.length === 0 || !paymentMethod || !customerDocument.trim() || !customerName.trim()}
                >
                    <i className="fa-solid fa-receipt mr-2"></i>
                    Imprimir Boleta / Cobrar
                </button>
            </div>
        </aside>
    )
}

export default Orden