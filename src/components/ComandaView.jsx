import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { getComandas, marcarComandaLista, SOCKET_BASE_URL } from '../api.js'

const toDateLabel = (value) => {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

const byFechaAsc = (a, b) => {
  const aTime = new Date(a.fecha_hora).getTime()
  const bTime = new Date(b.fecha_hora).getTime()
  return aTime - bTime
}

function ComandaView() {
  const [comandas, setComandas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingIds, setUpdatingIds] = useState(new Set())

  useEffect(() => {
    let isMounted = true

    const cargarComandas = async () => {
      try {
        setLoading(true)
        const data = await getComandas('todos')
        if (!isMounted) return
        setComandas(Array.isArray(data) ? data : [])
        setError('')
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'No se pudieron cargar las comandas')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    cargarComandas()

    const socket = io(SOCKET_BASE_URL, {
      transports: ['websocket', 'polling'],
    })

    socket.on('nueva_comanda', (comanda) => {
      if (!comanda?.id) return
      setComandas((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== comanda.id)
        return [...withoutCurrent, comanda]
      })
    })

    socket.on('comanda_lista', ({ comandaId, comanda }) => {
      setComandas((prev) => {
        if (comanda?.id) {
          const next = prev.filter((item) => item.id !== comanda.id)
          return [...next, comanda]
        }

        return prev.map((item) => {
          if (item.id !== comandaId) return item
          return {
            ...item,
            estado: 'listo',
            fecha_completado: new Date().toISOString(),
          }
        })
      })
    })

    return () => {
      isMounted = false
      socket.disconnect()
    }
  }, [])

  const pendientes = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.estado === 'pendiente')
      .sort(byFechaAsc)
  }, [comandas])

  const completadas = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.estado === 'listo')
      .sort(byFechaAsc)
  }, [comandas])

  const marcarLista = async (comandaId) => {
    setUpdatingIds((prev) => new Set(prev).add(comandaId))

    try {
      await marcarComandaLista(comandaId)
      setError('')
    } catch (err) {
      setError(err.message || 'No se pudo marcar la comanda como lista')
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(comandaId)
        return next
      })
    }
  }

  const renderCard = (comanda) => {
    const isDone = comanda.estado === 'listo'
    const isUpdating = updatingIds.has(comanda.id)

    return (
      <article
        key={comanda.id}
        className={`rounded-2xl border p-4 shadow-sm ${
          isDone
            ? 'border-emerald-200 bg-emerald-50/80'
            : 'border-amber-200 bg-amber-50/60'
        }`}
      >
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-sm uppercase tracking-[0.16em] text-slate-500'>Venta</p>
            <p className='text-xl font-semibold text-slate-900'>#{comanda.venta_id}</p>
          </div>
          <div className='text-right'>
            <p className='text-xs text-slate-500'>Hora pedido</p>
            <p className='text-sm font-semibold text-slate-800'>{toDateLabel(comanda.fecha_hora)}</p>
          </div>
        </div>

        <div className='mt-3 rounded-xl border border-white/80 bg-white/80 p-3'>
          <p className='text-xs font-semibold text-slate-500 tracking-wide'>PRODUCTOS</p>
          <ul className='mt-2 space-y-1 text-sm text-slate-800'>
            {comanda.items?.length ? (
              comanda.items.map((item) => (
                <li key={item.id} className='flex items-center justify-between gap-3'>
                  <span className={isDone ? 'line-through text-emerald-700' : ''}>{item.producto_nombre}</span>
                  <span className='font-semibold'>x{item.cantidad}</span>
                </li>
              ))
            ) : (
              <li className='text-slate-500'>Sin items</li>
            )}
          </ul>
        </div>

        <div className='mt-3'>
          <p className='text-xs font-semibold text-slate-500 tracking-wide'>DETALLE DE COMANDA</p>
          <p className={`mt-1 text-sm ${isDone ? 'line-through text-emerald-700' : 'text-slate-800'}`}>
            {comanda.detalle_comanda || 'Sin indicaciones'}
          </p>
        </div>

        <div className='mt-4 flex items-center justify-between'>
          <label className='flex items-center gap-2 text-sm font-medium text-slate-700'>
            <input
              type='checkbox'
              checked={isDone}
              disabled={isDone || isUpdating}
              onChange={() => marcarLista(comanda.id)}
              className='h-4 w-4 accent-emerald-600'
            />
            {isDone ? 'Pedido hecho' : 'Marcar como listo'}
          </label>

          {isDone && (
            <span className='text-xs font-semibold text-emerald-700'>
              Listo {toDateLabel(comanda.fecha_completado)}
            </span>
          )}
        </div>
      </article>
    )
  }

  return (
    <section className='h-screen bg-slate-100 px-6 py-5 overflow-hidden flex flex-col'>
      <header className='shrink-0'>
        <p className='text-xs uppercase tracking-[0.18em] text-blue-700 font-semibold'>Modulo Comanda</p>
        <h1 className='text-3xl font-semibold text-slate-900 mt-1'>Comandas en tiempo real</h1>
        <p className='text-sm text-slate-600 mt-1'>
          Las nuevas ventas aparecen automaticamente. Orden FIFO por hora de pedido.
        </p>
      </header>

      {error && (
        <div className='mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shrink-0'>
          {error}
        </div>
      )}

      <div className='mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0 flex-1'>
        <div className='rounded-2xl border border-amber-200 bg-white p-4 min-h-0 flex flex-col'>
          <div className='shrink-0 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Pendientes</h2>
            <span className='text-sm font-semibold text-amber-700'>{pendientes.length}</span>
          </div>

          <div className='mt-3 space-y-3 overflow-y-auto flex-1'>
            {loading ? (
              <p className='text-sm text-slate-500'>Cargando comandas...</p>
            ) : pendientes.length ? (
              pendientes.map(renderCard)
            ) : (
              <p className='text-sm text-slate-500'>No hay comandas pendientes.</p>
            )}
          </div>
        </div>

        <div className='rounded-2xl border border-emerald-200 bg-white p-4 min-h-0 flex flex-col'>
          <div className='shrink-0 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-slate-900'>Completadas</h2>
            <span className='text-sm font-semibold text-emerald-700'>{completadas.length}</span>
          </div>

          <div className='mt-3 space-y-3 overflow-y-auto flex-1'>
            {loading ? (
              <p className='text-sm text-slate-500'>Cargando comandas...</p>
            ) : completadas.length ? (
              completadas.map(renderCard)
            ) : (
              <p className='text-sm text-slate-500'>Aun no hay comandas completadas.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ComandaView
