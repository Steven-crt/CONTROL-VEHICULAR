import { useState, useEffect } from 'react'
import { Fuel, Wrench, Gauge, Download, DollarSign } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import toast from 'react-hot-toast'
import api from '../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getMesLabel(periodo) {
  if (!periodo) return ''
  const parts = periodo.split('-')
  if (parts.length === 2) {
    const mesIdx = parseInt(parts[1]) - 1
    return MESES_ES[mesIdx] || periodo
  }
  return periodo
}

function getVehiculoLabel(item) {
  if (item.vehiculo) return `${item.vehiculo.placa} - ${item.vehiculo.marca}`
  if (item.placa) return `${item.placa} - ${item.marca}`
  return `ID: ${item.vehiculo_id}`
}

const animOpts = (extra = {}) => ({
  animation: { duration: 1200, easing: 'easeInOutQuart' },
  transitions: { active: { animation: { duration: 400 } } },
  ...extra
})

export default function ReportesPage() {
  const [tab, setTab] = useState('gastos')
  const [combustible, setCombustible] = useState([])
  const [mantenimiento, setMantenimiento] = useState([])
  const [kilometraje, setKilometraje] = useState([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [empleadoModal, setEmpleadoModal] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [combRes, mantRes, kmRes] = await Promise.all([
          api.get('/reportes/combustible'),
          api.get('/reportes/mantenimiento'),
          api.get('/reportes/kilometraje')
        ])
        setCombustible(combRes.data)
        setMantenimiento(mantRes.data)
        setKilometraje(kmRes.data)
      } catch (error) {
        toast.error('Error al cargar reportes')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const gastosMensuales = [];
  const mesesUnicos = [...new Set(combustible.map(c => c.periodo).concat(mantenimiento.map(m => m.periodo)))].sort();
  mesesUnicos.forEach(mes => {
    const combMes = combustible.filter(c => c.periodo === mes);
    const mantMes = mantenimiento.filter(m => m.periodo === mes);
    gastosMensuales.push({
      mes: getMesLabel(mes),
      combustible: combMes.reduce((s, c) => s + parseFloat(c.total_costo || 0), 0),
      mantenimiento: mantMes.reduce((s, m) => s + parseFloat(m.total_costo || 0), 0)
    });
  });

  const gastosVehiculo = kilometraje.map(k => ({
    placa: k.placa,
    marca: k.marca,
    modelo: k.modelo,
    total: parseFloat(k.total_costo_combustible || 0) + (k.ultimo_mantenimiento ? 0 : 0)
  }));

  const totalGastos = gastosMensuales.reduce((s, m) => s + m.combustible + m.mantenimiento, 0)
  const totalCombustible = gastosMensuales.reduce((s, m) => s + m.combustible, 0)
  const totalMantenimiento = gastosMensuales.reduce((s, m) => s + m.mantenimiento, 0)

  const lineOpts = animOpts({
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } }
    }
  })

  const barOpts = animOpts({
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { ticks: { color: '#64748b', maxRotation: 45 }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } }
    }
  })

  const doughnutOpts = animOpts({
    responsive: true,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, usePointStyle: true, pointStyle: 'circle' } }
    }
  })

  const horizontBarOpts = animOpts({
    responsive: true,
    indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `S/. ${parseFloat(ctx.raw).toFixed(2)}` } } },
    scales: {
      x: { ticks: { color: '#64748b', callback: v => `S/. ${v}` }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  })

  const gastoLineData = {
    labels: gastosMensuales.map(g => g.mes),
    datasets: [
      {
        label: 'Combustible',
        data: gastosMensuales.map(g => g.combustible),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7
      },
      {
        label: 'Mantenimiento',
        data: gastosMensuales.map(g => g.mantenimiento),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7
      }
    ]
  }

  const gastoDoughnutData = {
    labels: ['Combustible', 'Mantenimiento'],
    datasets: [{
      data: [totalCombustible, totalMantenimiento],
      backgroundColor: ['#3b82f6', '#22c55e'],
      borderWidth: 2,
      borderColor: '#1e293b'
    }]
  }

  const gastoVehiculoBarData = {
    labels: gastosVehiculo.map(v => `${v.placa} ${v.marca}`),
    datasets: [{
      label: 'Costo Combustible',
      data: gastosVehiculo.map(v => v.total),
      backgroundColor: gastosVehiculo.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderRadius: 4
    }]
  }

  const exportCSV = (data, filename) => {
    if (!data.length) { toast.error('No hay datos para exportar'); return }
    const keys = Object.keys(data[0])
    const csv = [
      keys.join(','),
      ...data.map(row => keys.map(k => {
        const val = row[k]
        if (typeof val === 'object') return `"${JSON.stringify(val)}"`
        return `"${val ?? ''}"`
      }).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${filename}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Archivo descargado')
  }

  const handleFiltrarCombustible = async () => {
    try {
      const params = {}
      if (desde && hasta) { params.desde = desde; params.hasta = hasta }
      const { data } = await api.get('/reportes/combustible', { params })
      setCombustible(data)
      toast.success('Datos cargados')
    } catch (error) {
      toast.error('Error al filtrar')
    }
  }

  const handleFiltrarMantenimiento = async () => {
    try {
      const params = {}
      if (desde && hasta) { params.desde = desde; params.hasta = hasta }
      const { data } = await api.get('/reportes/mantenimiento', { params })
      setMantenimiento(data)
      toast.success('Datos cargados')
    } catch (error) {
      toast.error('Error al filtrar')
    }
  }

  const combChartData = {
    labels: combustible.map(c => `${c.periodo} - ${getVehiculoLabel(c)}`),
    datasets: [{
      label: 'Galones',
      data: combustible.map(c => parseFloat(c.total_galones) || 0),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 4
    }]
  }

  const mantChartData = {
    labels: mantenimiento.map(m => `${m.periodo} - ${getVehiculoLabel(m)}`),
    datasets: [{
      label: 'Costo (S/.)',
      data: mantenimiento.map(m => parseFloat(m.total_costo) || 0),
      backgroundColor: 'rgba(34, 197, 94, 0.7)',
      borderRadius: 4
    }]
  }

  if (loading) {
    return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando reportes...</div>
  }

  return (
    <div style={{ animation: 'slideUp 380ms ease both' }}>
      <div className="page-header">
        <h1>Reportes</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'gastos' ? 'active' : ''}`} onClick={() => setTab('gastos')}>
          <DollarSign size={16} style={{ marginRight: 6 }} /> Gastos
        </button>
        <button className={`tab ${tab === 'combustible' ? 'active' : ''}`} onClick={() => setTab('combustible')}>
          <Fuel size={16} style={{ marginRight: 6 }} /> Combustible
        </button>
        <button className={`tab ${tab === 'mantenimiento' ? 'active' : ''}`} onClick={() => setTab('mantenimiento')}>
          <Wrench size={16} style={{ marginRight: 6 }} /> Mantenimiento
        </button>
        <button className={`tab ${tab === 'kilometraje' ? 'active' : ''}`} onClick={() => setTab('kilometraje')}>
          <Gauge size={16} style={{ marginRight: 6 }} /> Kilometraje
        </button>
      </div>

      {/* GASTOS TAB */}
      {tab === 'gastos' && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon green"><DollarSign size={24} /></div>
              <div className="kpi-info">
                <h3>S/. {totalGastos.toFixed(2)}</h3>
                <p>Total Gastos</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon blue"><Fuel size={24} /></div>
              <div className="kpi-info">
                <h3>S/. {totalCombustible.toFixed(2)}</h3>
                <p>Gasto Combustible</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon yellow"><Wrench size={24} /></div>
              <div className="kpi-info">
                <h3>S/. {totalMantenimiento.toFixed(2)}</h3>
                <p>Gasto Mantenimiento</p>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon blue"><Gauge size={24} /></div>
              <div className="kpi-info">
                <h3>{kilometraje.length}</h3>
                <p>Vehículos</p>
              </div>
            </div>
          </div>

          <div className="grid-2 mb-6">
            <div className="chart-container">
              <h3>Evolucion Mensual de Gastos</h3>
              {gastosMensuales.length > 0 ? (
                <Line data={gastoLineData} options={lineOpts} />
              ) : (
                <p className="text-muted text-sm text-center" style={{ padding: 40 }}>Sin datos de gastos</p>
              )}
            </div>
            <div className="chart-container">
              <h3>Distribucion de Gastos</h3>
              {gastosMensuales.length > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 10 }}>
                  <div style={{ width: 260, maxWidth: '100%' }}>
                    <Doughnut data={gastoDoughnutData} options={doughnutOpts} />
                  </div>
                </div>
              ) : (
                <p className="text-muted text-sm text-center" style={{ padding: 40 }}>Sin datos de gastos</p>
              )}
            </div>
          </div>

          <div className="chart-container mb-6">
            <h3>Gasto Combustible por Vehiculo</h3>
            {gastosVehiculo.length > 0 ? (
              <Bar data={gastoVehiculoBarData} options={horizontBarOpts} />
            ) : (
              <p className="text-muted text-sm text-center" style={{ padding: 40 }}>Sin datos de vehiculos</p>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Detalle de Gastos Mensuales</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => exportCSV(gastosMensuales, 'gastos_mensuales')}>
                <Download size={14} /> Exportar
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th>Combustible</th>
                    <th>Mantenimiento</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosMensuales.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 40 }}>Sin datos de gastos</td></tr>
                  ) : gastosMensuales.map((g, i) => (
                    <tr key={i}>
                      <td><strong>{g.mes}</strong></td>
                      <td>S/. {g.combustible.toFixed(2)}</td>
                      <td>S/. {g.mantenimiento.toFixed(2)}</td>
                      <td><strong>S/. {(g.combustible + g.mantenimiento).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COMBUSTIBLE TAB */}
      {tab === 'combustible' && (
        <div>
          <div className="filter-bar mb-4">
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            <button className="btn btn-sm btn-primary" onClick={handleFiltrarCombustible}>
              Filtrar
            </button>
          </div>
          {combustible.length > 0 && (
            <div className="chart-container mb-6">
              <h3>Consumo de Combustible por Periodo</h3>
              <Bar data={combChartData} options={animOpts(barOpts)} />
            </div>
          )}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Detalle de Combustible</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => exportCSV(combustible, 'reporte_combustible')}>
                <Download size={14} /> Exportar
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Vehiculo</th>
                    <th>Cantidad</th>
                    <th>Galones</th>
                    <th>Costo</th>
                    <th>Precio Prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {combustible.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 40 }}>Sin datos de combustible</td></tr>
                  ) : combustible.map((c, i) => (
                    <tr key={i}>
                      <td>{c.periodo}</td>
                      <td>{getVehiculoLabel(c)}</td>
                      <td>{c.cantidad}</td>
                      <td>{parseFloat(c.total_galones).toFixed(2)}</td>
                      <td>S/. {parseFloat(c.total_costo).toFixed(2)}</td>
                      <td>{c.precio_promedio ? `S/. ${parseFloat(c.precio_promedio).toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MANTENIMIENTO TAB */}
      {tab === 'mantenimiento' && (
        <div>
          <div className="filter-bar mb-4">
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            <button className="btn btn-sm btn-primary" onClick={handleFiltrarMantenimiento}>
              Filtrar
            </button>
          </div>
          {mantenimiento.length > 0 && (
            <div className="chart-container mb-6">
              <h3>Costos de Mantenimiento por Periodo</h3>
              <Bar data={mantChartData} options={animOpts(barOpts)} />
            </div>
          )}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Detalle de Mantenimiento</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => exportCSV(mantenimiento, 'reporte_mantenimiento')}>
                <Download size={14} /> Exportar
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Vehiculo</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Costo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimiento.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 40 }}>Sin datos de mantenimiento</td></tr>
                  ) : mantenimiento.map((m, i) => (
                    <tr key={i}>
                      <td>{m.periodo}</td>
                      <td>{getVehiculoLabel(m)}</td>
                      <td><span className="badge badge-info">{m.tipo_mantenimiento?.nombre}</span></td>
                      <td>{m.cantidad}</td>
                      <td>S/. {parseFloat(m.total_costo).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* KILOMETRAJE TAB */}
      {tab === 'kilometraje' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Kilometraje por Vehiculo</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => exportCSV(kilometraje, 'reporte_kilometraje')}>
              <Download size={14} /> Exportar
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Marca / Modelo</th>
                  <th>Tipo</th>
                  <th>Kilometraje Actual</th>
                  <th>Galones Totales</th>
                  <th>Costo Combustible</th>
                  <th>Ultimo Mantenimiento</th>
                </tr>
              </thead>
              <tbody>
                {kilometraje.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 40 }}>Sin datos de kilometraje</td></tr>
                ) : kilometraje.map((k, i) => (
                  <tr key={i}>
                    <td><strong>{k.placa}</strong></td>
                    <td>{k.marca} {k.modelo}</td>
                    <td><span className="badge badge-info">{k.tipo}</span></td>
                    <td>{parseFloat(k.kilometraje_actual).toLocaleString()} km</td>
                    <td>{parseFloat(k.total_galones).toFixed(2)}</td>
                    <td>S/. {parseFloat(k.total_costo_combustible).toFixed(2)}</td>
                    <td className="text-sm">
                      {k.ultimo_mantenimiento
                        ? `${k.ultimo_mantenimiento.tipo} - ${new Date(k.ultimo_mantenimiento.fecha).toLocaleDateString('es-ES')}`
                        : 'Ninguno'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
