import { useState, useEffect } from 'react'
import { Truck, Fuel, Wrench, DollarSign } from 'lucide-react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import useAuthStore from '../store/authStore'
import api from '../services/api'
import styles from './DashboardPage.module.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const STATUS_COLORS = { Activo: '#22c55e', Inactivo: '#ef4444', 'En Mantenimiento': '#f59e0b' }
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null)
  const [combustibleMensual, setCombustibleMensual] = useState([])
  const [actividad, setActividad] = useState([])
  const [vehiculosEstado, setVehiculosEstado] = useState([])
  const [gastoMantenimiento, setGastoMantenimiento] = useState([])
  const [loading, setLoading] = useState(true)
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, combRes, actRes, vhRes, gastoRes] = await Promise.all([
          api.get('/dashboard/kpis'),
          api.get('/dashboard/combustible-mensual'),
          api.get('/dashboard/actividad-reciente'),
          api.get('/dashboard/vehiculos-estado'),
          api.get('/dashboard/gasto-mantenimiento')
        ])
        setKpis(kpiRes.data)
        setCombustibleMensual(combRes.data)
        setActividad(actRes.data)
        setVehiculosEstado(vhRes.data)
        setGastoMantenimiento(gastoRes.data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getMesLabel = (periodo) => {
    if (!periodo) return ''
    const parts = periodo.split('-')
    if (parts.length === 2) {
      const mesIdx = parseInt(parts[1]) - 1
      return MESES_ES[mesIdx] || periodo
    }
    return periodo
  }

  const kpiCards = [
    { icon: Truck, label: 'Total Vehiculos', value: kpis?.total_vehiculos || 0, color: 'blue', sub: `${kpis?.vehiculos_activos || 0} activos` },
    { icon: Fuel, label: 'Solicitudes Pendientes', value: kpis?.solicitudes_pendientes || 0, color: 'yellow', sub: 'Combustible' },
    { icon: Wrench, label: 'Mantenimientos Proximos', value: kpis?.mantenimientos_proximos || 0, color: 'red', sub: 'Programados' },
    { icon: DollarSign, label: 'Gasto Combustible', value: `S/. ${(kpis?.gasto_combustible || 0).toFixed(2)}`, color: 'green', sub: `${(kpis?.total_galones || 0).toFixed(1)} galones` }
  ]

  const lineData = {
    labels: combustibleMensual.map(c => getMesLabel(c.mes)),
    datasets: [{
      label: 'Galones',
      data: combustibleMensual.map(c => parseFloat(c.galones) || 0),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  const lineOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.5)' } }
    }
  }

  const doughnutData = {
    labels: vehiculosEstado.map(v => v.estado),
    datasets: [{
      data: vehiculosEstado.map(v => parseInt(v.total)),
      backgroundColor: vehiculosEstado.map(v => STATUS_COLORS[v.estado] || '#64748b'),
      borderWidth: 2,
      borderColor: '#1e293b'
    }]
  }

  const doughnutOptions = {
    responsive: true,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', padding: 16, usePointStyle: true, pointStyle: 'circle' }
      }
    }
  }

  const mantBarData = {
    labels: gastoMantenimiento.map(m => m.tipo_mantenimiento?.nombre || `Tipo ${m.tipo_mantenimiento_id}`),
    datasets: [{
      label: 'Costo (Q)',
      data: gastoMantenimiento.map(m => parseFloat(m.total_costo) || 0),
      backgroundColor: gastoMantenimiento.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderRadius: 4
    }]
  }

  const mantBarOptions = {
    responsive: true,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `Q${parseFloat(ctx.raw).toFixed(2)}` } }
    },
    scales: {
      x: { ticks: { color: '#64748b', callback: v => `Q${v}` }, grid: { color: 'rgba(51, 65, 85, 0.5)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  }

  const getBadgeClass = (estado) => {
    const map = {
      'Pendiente': 'badge-warning', 'Aprobada': 'badge-info', 'Rechazada': 'badge-danger',
      'Surtida': 'badge-success', 'Programado': 'badge-warning', 'En Proceso': 'badge-info',
      'Completado': 'badge-success', 'Cancelado': 'badge-danger'
    }
    return map[estado] || 'badge-secondary'
  }

  const renderActividad = (lista) => (
    <div className={styles.activityList}>
      {lista.map((a, i) => (
        <div key={i} className={styles.activityItem}>
          <div className={styles.activityInfo}>
            <p className="text-sm">{a.descripcion}</p>
            <p className="text-xs text-muted">
              {new Date(a.fecha).toLocaleDateString('es-ES', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
          <span className={`badge ${getBadgeClass(a.estado)}`}>{a.estado}</span>
        </div>
      ))}
    </div>
  )

  const renderVehiculosEstado = () => (
    <div className={styles.doughnutWrap}>
      <div className={styles.doughnutInner}>
        <Doughnut data={doughnutData} options={doughnutOptions} />
      </div>
    </div>
  )

  const emptyMsg = (msg) => (
    <p className="text-muted text-sm text-center" style={{ padding: '40px 0' }}>{msg}</p>
  )

  if (loading) {
    return <div className="text-center text-muted" style={{ padding: '60px' }}>Cargando dashboard...</div>
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Dashboard</h1>
        <p className="text-muted text-sm">Bienvenido, {usuario?.nombre || 'Usuario'}</p>
      </div>

      <div className="kpi-grid">
        {kpiCards.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className={`kpi-icon ${kpi.color}`}>
              <kpi.icon size={24} />
            </div>
            <div className="kpi-info">
              <h3>{kpi.value}</h3>
              <p>{kpi.label}</p>
              <p className="text-xs text-muted">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {isAdmin ? (
        <>
          <div className="grid-2 mb-6">
            <div className="chart-container">
              <h3>Consumo Mensual de Combustible</h3>
              {combustibleMensual.length > 0 ? (
                <Line data={lineData} options={lineOptions} />
              ) : emptyMsg('Sin datos de combustible')}
            </div>

            <div className="chart-container">
              <h3>Estado de la Flota</h3>
              {vehiculosEstado.length > 0 ? renderVehiculosEstado() : emptyMsg('Sin vehiculos registrados')}
            </div>
          </div>

          <div className="grid-2">
            <div className="chart-container">
              <h3>Costos de Mantenimiento por Tipo</h3>
              {gastoMantenimiento.length > 0 ? (
                <div className={styles.activityPadding}>
                  <Bar data={mantBarData} options={mantBarOptions} />
                </div>
              ) : emptyMsg('Sin datos de mantenimiento')}
            </div>

            <div className="chart-container">
              <h3>Actividad Reciente</h3>
              {actividad.length > 0 ? renderActividad(actividad) : emptyMsg('Sin actividad reciente')}
            </div>
          </div>
        </>
      ) : (
        <div className="grid-2">
          <div className="chart-container">
            <h3>Estado de la Flota</h3>
            {vehiculosEstado.length > 0 ? renderVehiculosEstado() : emptyMsg('Sin vehiculos registrados')}
          </div>

          <div className="chart-container">
            <h3>Actividad Reciente</h3>
            {actividad.length > 0 ? renderActividad(actividad) : emptyMsg('Sin actividad reciente')}
          </div>
        </div>
      )}
    </div>
  )
}
