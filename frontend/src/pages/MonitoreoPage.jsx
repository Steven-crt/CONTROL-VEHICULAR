import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import DOMPurify from 'dompurify'
import { X, Navigation, Fuel, Shield, AlertTriangle, TrendingDown, Activity, MapPin, Truck, Check, AlertCircle, WifiOff, Loader, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import api from '../services/api'
import styles from './MonitoreoPage.module.css'

// ==================== CONSTANTES ====================
const STATUS = { MOVING: 'En Movimiento', STOPPED: 'Detenido', OFFLINE: 'Desconectado' }
const POLL_INTERVAL = 10000 // 10 segundos
const GPS_INTERVAL = 8000 // 8 segundos entre reportes de ubicación
const OFFLINE_THRESHOLD = 5 * 60 * 1000 // 5 min sin actualización = offline
const STALE_THRESHOLD = 2 * 60 * 1000 // 2 min sin actualización = detenido

// ==================== EFICIENCIA (se mantiene de referencia) ====================
const EFICIENCIA = {
  'ABC-123': { km_gal: 28, tipo: 'Gasolina' },
  'DEF-456': { km_gal: 26, tipo: 'Gasolina' },
  'GHI-789': { km_gal: 18, tipo: 'Diesel' },
  'JKL-012': { km_gal: 27, tipo: 'Gasolina' },
  'MNO-345': { km_gal: 12, tipo: 'Diesel' },
  'STU-901': { km_gal: 10, tipo: 'Diesel' },
  'VWX-234': { km_gal: 30, tipo: 'Gasolina' },
  'PQR-678': { km_gal: 25, tipo: 'Gasolina' },
}
const PRECIOS = { Gasolina: 17.50, Diesel: 16.80 }

// ==================== UTILIDADES ====================
function calcHeading(from, to) {
  const dLng = to.lng - from.lng
  const dLat = to.lat - from.lat
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI)
  return angle + 180
}

function makeIcon(v, heading) {
  const cls = v.status === 'moving' ? styles.markerMoving : v.status === 'stopped' ? styles.markerStopped : styles.markerOffline
  const firstChar = v.placa ? v.placa.charAt(0) : '?'
  return L.divIcon({
    className: '',
    html: `<div class="${styles.markerWrap}" style="transform: rotate(${heading}deg)"><div class="${styles.markerBody} ${cls}">${firstChar}</div><div class="${styles.markerShadow}"></div></div>`,
    iconSize: [40, 52],
    iconAnchor: [20, 26],
    popupAnchor: [0, -30],
  })
}

function AnimatedMarkers({ vehiculos, selectedId, onSelect, trailsRef }) {
  const map = useMap()
  const markers = useRef({})
  const headings = useRef({})

  useEffect(() => {
    const ids = new Set(vehiculos.map(v => v.id))

    Object.keys(markers.current).forEach(id => {
      if (!ids.has(parseInt(id))) {
        map.removeLayer(markers.current[id].marker)
        if (trailsRef.current[id]) { map.removeLayer(trailsRef.current[id]); delete trailsRef.current[id] }
        delete markers.current[id]
      }
    })

    vehiculos.forEach(v => {
      if (!v.pos || !v.gps || v.status === 'offline') {
        const prev = markers.current[v.id]
        if (prev) {
          map.removeLayer(prev.marker)
          if (trailsRef.current[v.id]) { map.removeLayer(trailsRef.current[v.id]); delete trailsRef.current[v.id] }
          delete markers.current[v.id]
        }
        return
      }

      const pos = [v.pos.lat, v.pos.lng]
      const prev = markers.current[v.id]

      if (prev) {
        const old = prev.marker.getLatLng()
        const dist = Math.abs(old.lat - pos[0]) + Math.abs(old.lng - pos[1])
        if (dist > 0.000005) {
          prev.marker.setLatLng(pos)
          const h = calcHeading({ lat: old.lat, lng: old.lng }, v.pos)
          headings.current[v.id] = h
          prev.marker.setIcon(makeIcon(v, h))
          const trail = trailsRef.current[v.id]
          if (trail) {
            const pts = trail.getLatLngs()
            pts.push(L.latLng(pos[0], pos[1]))
            if (pts.length > 20) pts.shift()
            trail.setLatLngs(pts)
          }
        }
      } else {
        const h = headings.current[v.id] || 0
        const marker = L.marker(pos, { icon: makeIcon(v, h) }).addTo(map)
          .on('click', () => onSelect(v.id))
        
        const timeAgo = v.lastUpdate ? (() => {
          const seconds = Math.floor((Date.now() - v.lastUpdate) / 1000)
          if (seconds < 60) return `hace ${seconds}s`
          const minutes = Math.floor(seconds / 60)
          return `hace ${minutes}m`
        })() : 'desconocido'
        
        const popupHtml = `
          <div style="font-family:Inter,sans-serif;color:#111;min-width:200px">
            <div style="font-weight:800;font-size:16px;margin-bottom:2px">${v.placa || 'Sin placa'}</div>
            <div style="font-size:12px;color:#555;margin-bottom:6px">${v.marca || ''} ${v.modelo || ''}${v.ano ? ' (' + v.ano + ')' : ''}</div>
            <div style="font-size:12px;line-height:1.7">
              <div><strong>Empleado:</strong> ${v.empleado || 'Sin asignar'}</div>
              <div><strong>Estado:</strong> ${v.status === 'moving' ? '🟢 En Movimiento' : v.status === 'stopped' ? '🟠 Detenido' : '⚫ Desconectado'}</div>
              <div><strong>Velocidad:</strong> ${v.velocidad || 0} km/h</div>
              <div><strong>GPS:</strong> ${v.gps ? '✅ Activado' : '❌ Desactivado'}</div>
              <div><strong>Última actualización:</strong> ${timeAgo}</div>
              ${v.bateria !== null && v.bateria !== undefined ? `<div><strong>Batería:</strong> ${v.bateria}%</div>` : ''}
              ${v.precision_gps ? `<div><strong>Precisión:</strong> ${v.precision_gps.toFixed(0)}m</div>` : ''}
            </div>
          </div>
        `
        marker.bindPopup(DOMPurify.sanitize(popupHtml))
        markers.current[v.id] = { marker, pos: v.pos }
        headings.current[v.id] = 0

        const trail = trailsRef.current[v.id]
        if (trail) { map.addLayer(trail) }
      }
    })
  }, [vehiculos, selectedId])

  return null
}

function MapController({ center }) {
  const map = useMap()
  useEffect(() => { if (center) map.setView(center, 14.5, { animate: true }) }, [center])
  return null
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function MonitoreoPage() {
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'Administrador'

  // Estados principales
  const [tab, setTab] = useState('mapa')
  const [vehiculos, setVehiculos] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [center, setCenter] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [confirmGpsId, setConfirmGpsId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [solicitudEnviada, setSolicitudEnviada] = useState(false)

  // Refs
  const sheetRef = useRef(null)
  const touchStartY = useRef(0)
  const touchEndY = useRef(0)
  const pollRef = useRef(null)
  const trailsRef = useRef({})
  const socketRef = useRef(null)
  const watchIdRef = useRef(null)
  const gpsIntervalRef = useRef(null)
  const lastPosRef = useRef(null)

  const selected = useMemo(() => vehiculos.find(v => v.id === selectedId), [vehiculos, selectedId])

  // ==================== WEBSOCKET ====================
  const connectSocket = useCallback(() => {
    const token = sessionStorage.getItem('auth-storage')
    if (!token) return

    let authToken = null
    try {
      const parsed = JSON.parse(token)
      authToken = parsed.state?.token || null
    } catch { return }

    if (!authToken) return

    try {
      // Import dinámico para Socket.io
      import('socket.io-client').then(({ io }) => {
        // Determinar URL del backend
        const apiUrl = import.meta.env.VITE_API_URL || '/api'
        const baseUrl = apiUrl.replace('/api', '')
        const socketUrl = baseUrl || window.location.origin
        // En Vercel (ruta relativa) Socket.IO solo funciona con polling, no WebSocket
        const isVercel = apiUrl === '/api' || apiUrl.startsWith('/')

        const socket = io(socketUrl, {
          auth: { token: authToken },
          transports: isVercel ? ['polling'] : ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000
        })

        socket.on('connect', () => {
          console.log('✅ WebSocket conectado')
          setConnected(true)
        })

        socket.on('ubicacion:actualizada', (data) => {
          console.log('📍 Ubicación recibida:', data)
          setVehiculos(prev => {
            const idx = prev.findIndex(v => v.id === data.vehiculo_id)
            const now = Date.now()
            const velocidad = data.velocidad || 0
            const status = velocidad > 5 ? 'moving' : 'stopped'

            const updated = {
              id: data.vehiculo_id,
              placa: data.placa || prev[idx]?.placa || '',
              marca: data.marca || prev[idx]?.marca || '',
              modelo: data.modelo || prev[idx]?.modelo || '',
              ano: data.ano || prev[idx]?.ano || 0,
              tipo_vehiculo: data.tipo_vehiculo || prev[idx]?.tipo_vehiculo || null,
              empleado: data.empleado || prev[idx]?.empleado || null,
              pos: { lat: data.latitud, lng: data.longitud },
              velocidad,
              status,
              gps: true,
              bateria: data.bateria,
              precision_gps: data.precision_gps || 0,
              lastUpdate: now,
              km: prev[idx]?.km || 0,
              fuel: prev[idx]?.fuel || 0,
              gas: prev[idx]?.gas || 0,
            }

            if (idx >= 0) {
              const newArr = [...prev]
              newArr[idx] = updated
              return newArr
            }
            return [...prev, updated]
          })
        })

        socket.on('ubicacion:confirmada', (data) => {
          console.log('✅ Ubicación confirmada:', data)
        })

        socket.on('disconnect', () => {
          setConnected(false)
        })

        socket.on('connect_error', () => {
          setConnected(false)
        })

        socketRef.current = socket
      })
    } catch (err) {
      console.warn('Error al conectar WebSocket:', err)
      setConnected(false)
    }
  }, [])

  // ==================== GEOLOCATION API (EMPLEADO) ====================
  const startGeolocation = useCallback((vehiculoId) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation no soportada')
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    }

    // Enviar ubicación cada ~8 segundos via WebSocket + HTTP backup
    const sendPosition = (lat, lng, accuracy, heading, speed) => {
      const payload = {
        vehiculo_id: vehiculoId,
        latitud: lat,
        longitud: lng,
        velocidad: speed || 0,
        direccion: heading || 0,
        precision_gps: accuracy || 0
      }

      // Enviar por WebSocket (prioritario)
      if (socketRef.current?.connected) {
        console.log('✅ Enviando por WebSocket')
        socketRef.current.emit('ubicacion:reportar', payload)
      }

      // Backup via HTTP (cada 2° envío)
      if (!lastPosRef.current || Math.random() < 0.5) {
        console.log('📤 Enviando por HTTP backup')
        api.post('/ubicaciones', payload).catch(() => console.warn('HTTP backup failed'))
      }

      lastPosRef.current = { lat, lng, time: Date.now() }
    }

    // watchPosition para seguimiento continuo
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords
        sendPosition(latitude, longitude, accuracy, heading, speed)
      },
      (err) => {
        console.warn('Error de geolocalización:', err.message)
        if (err.code === 1) {
          setConfirmGpsId(null)
          setVehiculos(prev => prev.map(v =>
            v.id === vehiculoId ? { ...v, gps: false, status: 'offline' } : v
          ))
        }
      },
      options
    )

    // También enviar periódicamente como respaldo
    gpsIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy, heading, speed } = position.coords
          sendPosition(latitude, longitude, accuracy, heading, speed)
        },
        () => {},
        options
      )
    }, GPS_INTERVAL)
  }, [])

  const stopGeolocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current)
      gpsIntervalRef.current = null
    }
    lastPosRef.current = null
  }, [])

  // ==================== FETCH DATA (ADMIN) ====================
  const fetchUbicaciones = useCallback(async () => {
    try {
      const { data } = await api.get('/ubicaciones/actuales')
      const now = Date.now()
      const mapped = data.map(v => {
        const tiempoTranscurrido = v.lastUpdate ? now - v.lastUpdate : Infinity
        let status = 'offline'
        if (v.gps && v.pos) {
          if (tiempoTranscurrido < STALE_THRESHOLD) {
            status = v.velocidad > 5 ? 'moving' : 'stopped'
          } else if (tiempoTranscurrido < OFFLINE_THRESHOLD) {
            status = 'stopped'
          } else {
            status = 'offline'
          }
        }
        return {
          ...v,
          status,
          gps: v.gps || false,
          velocidad: v.velocidad || 0,
          km: 0,
          fuel: 0,
          gas: 0
        }
      })
      setVehiculos(mapped)
      setLoading(false)
      setError(null)
    } catch (err) {
      console.error('Error fetching ubicaciones:', err)
      setError('No se pudieron cargar las ubicaciones')
      setLoading(false)
    }
  }, [])

  // ==================== FETCH MIS VEHICULOS (EMPLEADO) ====================
  const fetchMisVehiculos = useCallback(async () => {
    try {
      const { data } = await api.get('/ubicaciones/mis-vehiculos')
      const mapped = data.map(v => ({
        id: v.id,
        placa: v.placa || '',
        marca: v.marca || '',
        modelo: v.modelo || '',
        ano: v.ano || 0,
        tipo_vehiculo: v.tipo_vehiculo || null,
        empleado: `${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim() || null,
        pos: v.pos || null,
        velocidad: v.velocidad || 0,
        gps: v.gps || false,
        status: v.gps ? (v.velocidad > 5 ? 'moving' : 'stopped') : 'offline',
        lastUpdate: v.lastUpdate || Date.now(),
        km: 0,
        fuel: 0,
        gas: 0
      }))
      setVehiculos(mapped)
      setLoading(false)
      setError(null)
    } catch (err) {
      console.error('Error fetching mis vehiculos:', err)
      setError('No se pudieron cargar tus vehículos asignados')
      setLoading(false)
    }
  }, [usuario])

  // ==================== SOLICITAR VEHICULO (EMPLEADO) ====================
  const handleSolicitarVehiculo = useCallback(async () => {
    try {
      await api.post('/notificaciones/solicitar-vehiculo')
      setSolicitudEnviada(true)
      toast.success('Solicitud enviada al administrador')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar solicitud')
    }
  }, [])

  // ==================== INIT ====================
  useEffect(() => {
    // Conectar WebSocket
    connectSocket()

    // Cargar datos iniciales
    if (isAdmin) {
      fetchUbicaciones()
      // Polling cada 10s como respaldo
      pollRef.current = setInterval(fetchUbicaciones, POLL_INTERVAL)
    } else {
      fetchMisVehiculos()
      pollRef.current = setInterval(fetchMisVehiculos, POLL_INTERVAL)
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      stopGeolocation()
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
      }
    }
  }, [isAdmin])

  // ==================== GPS TOGGLE (EMPLEADO) ====================
  const toggleGps = useCallback((id, e) => {
    if (e) e.stopPropagation()
    const v = vehiculos.find(v => v.id === id)
    if (!v) return

    if (!v.gps) {
      setConfirmGpsId(id)
    } else {
      stopGeolocation()
      setVehiculos(prev => prev.map(v => {
        if (v.id !== id) return v
        return { ...v, gps: false, status: 'offline', lastUpdate: Date.now() }
      }))
    }
  }, [vehiculos, stopGeolocation])

  const confirmGpsActivation = useCallback(() => {
    if (confirmGpsId === null) return
    console.log('🚗 Activando GPS para vehículo:', confirmGpsId)
    setVehiculos(prev => prev.map(v => {
      if (v.id !== confirmGpsId) return v
      return { ...v, gps: true, status: 'moving', lastUpdate: Date.now() }
    }))
    startGeolocation(confirmGpsId)
    setConfirmGpsId(null)
  }, [confirmGpsId, startGeolocation])

  const cancelGps = useCallback(() => {
    setConfirmGpsId(null)
  }, [])

  // ==================== FILTROS Y ESTADÍSTICAS ====================
  const filtered = useMemo(() => {
    if (activeFilter === 'moving') return vehiculos.filter(v => v.status === 'moving' && v.gps)
    if (activeFilter === 'stopped') return vehiculos.filter(v => v.status === 'stopped')
    if (activeFilter === 'offline') return vehiculos.filter(v => v.status === 'offline' || !v.gps)
    return vehiculos
  }, [vehiculos, activeFilter])

  const stats = useMemo(() => {
    return {
      moving: vehiculos.filter(v => v.status === 'moving' && v.gps).length,
      stopped: vehiculos.filter(v => v.status === 'stopped').length,
      offline: vehiculos.filter(v => v.status === 'offline' || !v.gps).length,
      gpsOn: vehiculos.filter(v => v.gps).length,
    }
  }, [vehiculos])

  // ==================== EFICIENCIA ====================
  const eficiencia = useMemo(() => {
    return vehiculos.filter(v => v.gps && v.empleado).map(v => {
      const eff = EFICIENCIA[v.placa]
      if (!eff) return null
      const gasEsp = (v.km || 0) / eff.km_gal
      const costEsp = gasEsp * PRECIOS[eff.tipo]
      const diff = (v.gas || 0) - costEsp
      return { ...v, gas_esp: gasEsp, cost_esp: costEsp, diff: Math.round(diff * 100) / 100, rend: eff.km_gal, tipo: eff.tipo }
    }).filter(Boolean)
  }, [vehiculos])

  const totalReal = eficiencia.reduce((s, e) => s + (e.gas || 0), 0)
  const totalEsp = eficiencia.reduce((s, e) => s + e.cost_esp, 0)
  const totalDiff = totalReal - totalEsp

  // ==================== HANDLERS ====================
  const handleSheetTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleSheetTouchMove = useCallback((e) => {
    touchEndY.current = e.touches[0].clientY
  }, [])

  const handleSheetTouchEnd = useCallback(() => {
    const diff = touchStartY.current - touchEndY.current
    if (Math.abs(diff) > 40) {
      setSheetExpanded(diff > 0)
    }
    touchStartY.current = 0
    touchEndY.current = 0
  }, [])

  const tAgo = (ts) => {
    if (!ts) return 'Desconocido'
    const d = Math.floor((Date.now() - ts) / 60000)
    if (d < 1) return 'ahora'
    if (d < 60) return `hace ${d} min`
    const h = Math.floor(d / 60)
    return `hace ${h}h ${d % 60}m`
  }

  const goto = useCallback((v) => {
    if (!v.pos) return
    setSelectedId(v.id)
    setCenter([v.pos.lat, v.pos.lng])
  }, [])

  // ==================== MODAL GPS ====================
  const gpsConfirmModal = confirmGpsId !== null && (() => {
    const v = vehiculos.find(v => v.id === confirmGpsId)
    if (!v) return null
    return (
      <div className={styles.gpsOverlay} onClick={cancelGps}>
        <div className={styles.gpsModal} onClick={e => e.stopPropagation()}>
          <AlertCircle size={32} className={styles.gpsModalIcon} />
          <h3 className={styles.gpsModalTitle}>Autorización de Ubicación</h3>
          <p className={styles.gpsModalDesc}>
            ¿Autorizas activar el GPS del vehículo <strong>{v.placa}</strong>?
            Tu ubicación en tiempo real será visible para los administradores del sistema.
            El navegador te pedirá permiso para acceder a tu ubicación.
          </p>
          <div className={styles.gpsModalInfo}>
            <Truck size={14} /> {v.marca} {v.modelo}{v.ano ? ` (${v.ano})` : ''}
          </div>
          <div className={styles.gpsModalActions}>
            <button className={`btn btn-secondary ${styles.gpsModalBtn}`} onClick={cancelGps}>Cancelar</button>
            <button className={`btn btn-primary ${styles.gpsModalBtn}`} onClick={confirmGpsActivation}>
              <Check size={14} /> Autorizar y Activar GPS
            </button>
          </div>
        </div>
      </div>
    )
  })()

  // ==================== VISTA DE CARGA ====================
  if (loading) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <Loader size={48} className="spin-animation" />
        <h3>Cargando monitoreo GPS...</h3>
        <p className="text-muted">Obteniendo ubicaciones en tiempo real</p>
      </div>
    )
  }

  // ==================== VISTA DE ERROR (solo para empleados sin vehículos) ====================
  if (error && vehiculos.length === 0 && !isAdmin) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <WifiOff size={48} style={{ color: '#ef4444' }} />
        <h3>Error de conexión</h3>
        <p className="text-muted" style={{ maxWidth: 400, margin: '0 auto' }}>{error}</p>
        <div className="flex gap-4 mt-4" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={fetchMisVehiculos}>
            Reintentar
          </button>
          {!solicitudEnviada && (
            <button className="btn btn-secondary" onClick={handleSolicitarVehiculo}>
              <Send size={16} /> Solicitar Vehículo
            </button>
          )}
        </div>
      </div>
    )
  }

  // ==================== VISTA EMPLEADO ====================
  if (!isAdmin) {
    const vehiculoConGPS = vehiculos.find(v => v.gps && v.pos);
    
    return (
      <div style={{ animation: 'slideUp 380ms ease both' }}>
        <div className="page-header">
          <h1>Monitoreo GPS</h1>
          {connected && <span className="badge badge-success" style={{ fontSize: 10 }}>En vivo</span>}
        </div>
        
        {vehiculoConGPS ? (
          // Mostrar mapa cuando hay GPS activo
          <div className={styles.pageWrap}>
            <div className={styles.mapWrapper}>
              <MapContainer 
                center={[vehiculoConGPS.pos.lat, vehiculoConGPS.pos.lng]} 
                zoom={15} 
                className={styles.mapEl} 
                scrollWheelZoom={true}
              >
                <TileLayer 
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                />
                <MapController center={vehiculoConGPS.pos ? [vehiculoConGPS.pos.lat, vehiculoConGPS.pos.lng] : null} />
                <AnimatedMarkers 
                  vehiculos={vehiculos.filter(v => v.gps && v.pos)} 
                  selectedId={selectedId} 
                  onSelect={setSelectedId} 
                  trailsRef={trailsRef} 
                />
              </MapContainer>

              <div className={styles.statsFloating}>
                <div className={styles.statItem}>
                  <Navigation size={14} color="#22c55e" />
                  <span>{vehiculoConGPS.velocidad || 0} km/h</span>
                </div>
                <div className={styles.statItem}>
                  <MapPin size={14} color="#3b82f6" />
                  <span>GPS Activo</span>
                </div>
                {vehiculoConGPS.bateria && (
                  <div className={styles.statItem}>
                    <Activity size={14} color="#f59e0b" />
                    <span>{vehiculoConGPS.bateria}%</span>
                  </div>
                )}
              </div>

              <div className={`${styles.bottomSheet} ${sheetExpanded ? styles.bottomSheetExpanded : ''}`} ref={sheetRef}>
                <div className={styles.sheetHeader}
                  onClick={() => setSheetExpanded(prev => !prev)}
                  onTouchStart={handleSheetTouchStart}
                  onTouchMove={handleSheetTouchMove}
                  onTouchEnd={handleSheetTouchEnd}
                >
                  <div className={styles.sheetHandle} />
                  <div className={styles.sheetHeaderRow}>
                    <span className={styles.sheetTitle}>Mis Vehículos ({vehiculos.length})</span>
                    <span className={styles.sheetExpandIcon}>{sheetExpanded ? '▼' : '▲'}</span>
                  </div>
                </div>
                <div className={styles.sheetList}>
                  {vehiculos.map((v, i) => {
                    const statusText = v.gps ? (v.status === 'moving' ? 'En Movimiento' : 'GPS Activo') : 'GPS Desactivado'
                    const statusColor = v.gps ? (v.status === 'moving' ? '#22c55e' : '#3b82f6') : '#64748b'
                    return (
                      <div key={v.id} className={`${styles.sheetCard} ${selectedId === v.id ? styles.sheetCardActive : ''}`} onClick={() => toggleGps(v.id)} style={{ animationDelay: `${i * 30}ms` }}>
                        <div className={styles.sheetCardLeft}>
                          <div className={styles.sheetMarker} style={{ background: statusColor }}>
                            <span>{v.placa ? v.placa.charAt(0) : '?'}</span>
                          </div>
                          <div>
                            <div className={styles.sheetCardTitle}>{v.placa || 'Sin placa'}</div>
                            <div className={styles.sheetCardSub}>{v.marca} {v.modelo}</div>
                          </div>
                        </div>
                        <div className={styles.sheetCardRight}>
                          <div className={styles.sheetSpeed}>{v.velocidad || 0} <span>km/h</span></div>
                          <div className={styles.sheetStatus}>
                            <span className={styles.sheetDot} style={{ background: statusColor }} />
                            {statusText}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Mostrar pantalla de activación si no hay GPS activo
          <div className="empty-state">
            <Shield size={48} />
            <h3>Control de Ubicación</h3>
            <p style={{ maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
              Activa tu GPS para compartir tu ubicación en tiempo real con los administradores.
              Tus datos están protegidos y solo visibles para el personal autorizado.
            </p>
            <div className="kpi-grid" style={{ maxWidth: 420, margin: '24px auto' }}>
              {vehiculos.length === 0 ? (
                <div className="text-center" style={{ gridColumn: '1 / -1', padding: 20 }}>
                  <p className="text-muted">No tienes vehículos asignados</p>
                  {!solicitudEnviada ? (
                    <button className="btn btn-primary mt-3" onClick={handleSolicitarVehiculo}>
                      <Send size={16} /> Solicitar Vehículo
                    </button>
                  ) : (
                    <p className="text-success mt-3" style={{ fontSize: 13 }}>
                      <Check size={14} /> Solicitud enviada — espera a que el administrador asigne un vehículo
                    </p>
                  )}
                </div>
              ) : vehiculos.map(v => (
                <div key={v.id} className="kpi-card" style={{ cursor: 'pointer' }} onClick={(e) => toggleGps(v.id, e)}>
                  <div className="kpi-icon" style={{ background: v.gps ? 'rgba(34,197,94,0.14)' : 'rgba(100,116,139,0.14)', color: v.gps ? '#22c55e' : '#64748b' }}>
                    <Truck size={24} />
                  </div>
                  <div className="kpi-info">
                    <h3>{v.placa}</h3>
                    <p>{v.marca} {v.modelo}</p>
                    <p className="text-xs" style={{ marginTop: 4, color: v.gps ? '#22c55e' : '#64748b' }}>
                      GPS: {v.gps ? 'Activado 🟢' : 'Desactivado'}
                      {v.gps && v.precision_gps > 0 && ` (${v.precision_gps.toFixed(0)}m)`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {!navigator.geolocation && (
              <div className="alert alert-warning" style={{ maxWidth: 420, margin: '0 auto' }}>
                Tu navegador no soporta geolocalización. Usa un dispositivo móvil o Chrome.
              </div>
            )}
          </div>
        )}
        {gpsConfirmModal}
      </div>
    )
  }

  // ==================== VISTA ADMIN ====================
  return (
    <div className={styles.pageWrap}>
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1 className={styles.topBarTitle}>Monitoreo GPS</h1>
          <div className={styles.filterChips}>
            {['all', 'moving', 'stopped', 'offline'].map(f => (
              <button key={f} className={`${styles.chip} ${activeFilter === f ? styles.chipActive : ''}`} onClick={() => setActiveFilter(f)}>
                {f === 'all' ? 'Todos' : f === 'moving' ? 'En Movimiento' : f === 'stopped' ? 'Detenidos' : 'Desconectados'}
                <span className={styles.chipCount}>{f === 'all' ? vehiculos.length : f === 'moving' ? stats.moving : f === 'stopped' ? stats.stopped : stats.offline}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.topBarRight}>
          <div className={`${styles.securityBadge} ${!connected ? styles.disconnected : ''}`} style={!connected ? { borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' } : {}}>
            <Shield size={12} /> {connected ? 'En vivo' : 'Reconectando...'}
          </div>
          <button className="btn btn-sm btn-secondary" onClick={fetchUbicaciones} title="Actualizar ahora">
            <Loader size={12} style={{ marginRight: 4 }} /> 
          </button>
        </div>
      </div>

      <div className={styles.mapWrapper}>
        <MapContainer center={[-12.0464, -77.0428]} zoom={12} className={styles.mapEl} scrollWheelZoom={true}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController center={center} />
          <AnimatedMarkers vehiculos={filtered} selectedId={selectedId} onSelect={(id) => {
            const v = vehiculos.find(x => x.id === id)
            if (v) goto(v)
          }} trailsRef={trailsRef} />
        </MapContainer>

        <div className={styles.statsFloating}>
          <div className={styles.statItem}>
            <Navigation size={14} color="#22c55e" />
            <span>{stats.moving}</span>
          </div>
          <div className={styles.statItem}>
            <MapPin size={14} color="#f59e0b" />
            <span>{stats.stopped}</span>
          </div>
          <div className={styles.statItem}>
            <Truck size={14} color="#64748b" />
            <span>{stats.offline}</span>
          </div>
          <div className={styles.statItem}>
            <Activity size={14} color="var(--accent)" />
            <span>{stats.gpsOn}/{vehiculos.length}</span>
          </div>
        </div>

        <div className={`${styles.bottomSheet} ${sheetExpanded ? styles.bottomSheetExpanded : ''}`} ref={sheetRef}>
          <div className={styles.sheetHeader}
            onClick={() => setSheetExpanded(prev => !prev)}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
          >
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeaderRow}>
              <span className={styles.sheetTitle}>Vehículos ({filtered.length})</span>
              <span className={styles.sheetExpandIcon}>{sheetExpanded ? '▼' : '▲'}</span>
            </div>
          </div>
          <div className={styles.sheetList}>
            {filtered.length === 0 ? (
              <div className="text-center text-muted" style={{ padding: 30, fontSize: 13 }}>
                {activeFilter === 'all' ? 'No hay vehículos disponibles' : 'Ningún vehículo en esta categoría'}
              </div>
            ) : filtered.map((v, i) => {
              const statusText = v.status === 'moving' ? 'En Movimiento' : v.status === 'stopped' ? 'Detenido' : 'Desconectado'
              const statusColor = v.status === 'moving' ? '#22c55e' : v.status === 'stopped' ? '#f59e0b' : '#64748b'
              return (
                <div key={v.id} className={`${styles.sheetCard} ${selectedId === v.id ? styles.sheetCardActive : ''}`} onClick={() => goto(v)} style={{ animationDelay: `${i * 30}ms`, opacity: v.gps ? 1 : 0.5 }}>
                  <div className={styles.sheetCardLeft}>
                    <div className={styles.sheetMarker} style={{ background: statusColor }}>
                      <span>{v.placa ? v.placa.charAt(0) : '?'}</span>
                    </div>
                    <div>
                      <div className={styles.sheetCardTitle}>{v.placa || 'Sin placa'}</div>
                      <div className={styles.sheetCardSub}>{v.marca} {v.modelo}{v.empleado ? ` - ${v.empleado}` : ''}</div>
                    </div>
                  </div>
                  <div className={styles.sheetCardRight}>
                    <div className={styles.sheetSpeed}>{v.velocidad || 0} <span>km/h</span></div>
                    <div className={styles.sheetStatus}>
                      <span className={styles.sheetDot} style={{ background: statusColor }} />
                      {statusText}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {selected && (
          <div className={styles.infoCard} onClick={() => setSelectedId(null)}>
            <div className={styles.infoCardContent} onClick={e => e.stopPropagation()}>
              <button className={styles.infoClose} onClick={() => setSelectedId(null)}><X size={16} /></button>
              <div className={styles.infoHeader}>
                <div className={styles.infoMarker} style={{ background: selected.status === 'moving' ? '#22c55e' : selected.status === 'stopped' ? '#f59e0b' : '#64748b' }}>
                  {selected.placa ? selected.placa.charAt(0) : '?'}
                </div>
                <div>
                  <h3>{selected.placa || 'Sin placa'}</h3>
                  <p>{selected.marca} {selected.modelo}{selected.ano ? ` (${selected.ano})` : ''}</p>
                </div>
              </div>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <Navigation size={14} /> <span>{selected.velocidad || 0} km/h</span>
                </div>
                <div className={styles.infoItem}>
                  <MapPin size={14} /> <span>{tAgo(selected.lastUpdate)}</span>
                </div>
                <div className={styles.infoItem}>
                  <Truck size={14} /> <span>{selected.empleado || 'Sin asignar'}</span>
                </div>
                {selected.bateria !== null && selected.bateria !== undefined && (
                  <div className={styles.infoItem}>
                    <Activity size={14} /> <span>Batería {selected.bateria}%</span>
                  </div>
                )}
              </div>
              <div className={styles.gpsToggleRow}>
                <div className={styles.gpsStatus}>
                  GPS: {selected.gps ? 'Activado' : 'Desactivado'}
                  {selected.precision_gps > 0 && ` (${selected.precision_gps.toFixed(0)}m)`}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.tabsFloating}>
          <button className={`${styles.tabF} ${tab === 'mapa' ? styles.tabFActive : ''}`} onClick={() => setTab('mapa')}><MapPin size={14} /> Mapa</button>
          <button className={`${styles.tabF} ${tab === 'eficiencia' ? styles.tabFActive : ''}`} onClick={() => setTab('eficiencia')}><Fuel size={14} /> Eficiencia</button>
        </div>
      </div>

      {tab === 'eficiencia' && (
        <div className={styles.eficienciaPanel}>
          <div className={styles.eficienciaGrid}>
            <div className={styles.efCard}><h3 style={{ color: 'var(--accent)' }}>s/. {totalReal.toFixed(2)}</h3><p>Gasto Real</p></div>
            <div className={styles.efCard}><h3 style={{ color: '#3b82f6' }}>s/. {totalEsp.toFixed(2)}</h3><p>Gasto Esperado</p></div>
            <div className={styles.efCard}><h3 style={{ color: totalDiff > 0 ? '#ef4444' : '#22c55e' }}>s/. {Math.abs(totalDiff).toFixed(2)}</h3><p>{totalDiff > 0 ? 'Sobrecosto' : 'Ahorro'}</p></div>
            <div className={styles.efCard}><h3 style={{ color: '#a855f7' }}>{Math.round(eficiencia.reduce((s, e) => s + e.gas_esp, 0))} gal</h3><p>Comb. Esperado</p></div>
          </div>
          {eficiencia.some(e => e.diff > 50) && (
            <div className={`${styles.alertB} ${styles.alertDanger}`}><AlertTriangle size={14} /> Hay vehículos gastando más de lo esperado según su GPS.</div>
          )}
          {eficiencia.some(e => e.diff < -50) && (
            <div className={`${styles.alertB} ${styles.alertSuccess}`}><TrendingDown size={14} /> Algunos vehículos ahorran combustible.</div>
          )}
          <div className="card">
            <div className="card-header"><h3 className="card-title">Consumo Real vs Esperado</h3></div>
            <div className={styles.tableScroll}>
              <table className={`${styles.efTable} mobile-cards`}>
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Empleado</th>
                    <th>Km</th>
                    <th>Rend.</th>
                    <th>Gas. Esp.</th>
                    <th>Costo Esp.</th>
                    <th>Costo Real</th>
                    <th>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {eficiencia.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 40 }}>Esperando datos de GPS para calcular eficiencia.</td></tr>
                  ) : eficiencia.map((e, i) => (
                    <tr key={i}>
                      <td data-label="Vehículo"><strong>{e.placa}</strong></td>
                      <td data-label="Empleado">{e.empleado}</td>
                      <td data-label="Km">{Math.round(e.km || 0).toLocaleString()} km</td>
                      <td data-label="Rend."><span className="badge badge-info">{e.rend} km/gal</span></td>
                      <td data-label="Gas. Esp.">{e.gas_esp.toFixed(2)} gal</td>
                      <td data-label="Costo Esp.">s/. {e.cost_esp.toFixed(2)}</td>
                      <td data-label="Costo Real">s/. {(e.gas || 0).toFixed(2)}</td>
                      <td data-label="Diferencia"><span className={`badge ${e.diff > 0 ? 'badge-danger' : e.diff < 0 ? 'badge-success' : 'badge-secondary'}`} style={{ fontSize: 11 }}>{e.diff > 0 ? '+' : ''}s/. {e.diff.toFixed(2)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {gpsConfirmModal}
    </div>
  )
}
