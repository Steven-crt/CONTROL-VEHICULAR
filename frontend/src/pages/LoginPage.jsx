import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  // 3D Parallax Mouse Effect
  const sectionRef = useRef(null)
  const signinRef = useRef(null)
  const orbRef = useRef(null)
  const orb2Ref = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const rafRef = useRef(null)

  useEffect(() => {
    let time = 0

    const handleMouseMove = (e) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      mouseRef.current.tx = (e.clientX - cx) / cx
      mouseRef.current.ty = (e.clientY - cy) / cy
    }

    const animate = () => {
      time += 0.008
      const m = mouseRef.current

      // Smooth interpolation (lerp) for butter-smooth movement
      m.x += (m.tx - m.x) * 0.06
      m.y += (m.ty - m.y) * 0.06

      // Subtle auto-float drift - keeps alive even when mouse is still
      const driftX = Math.sin(time * 0.4) * 0.06
      const driftY = Math.sin(time * 0.55) * 0.06
      const mx = m.x + driftX
      const my = m.y + driftY

      // Signin card: 3D tilt (max ~5deg)
      if (signinRef.current) {
        signinRef.current.style.transform =
          `translate(-50%, -50%) rotateX(${my * -5}deg) rotateY(${mx * 5}deg)`
      }

      // Orbs: parallax depth (opposite directions for multilayer feel)
      if (orbRef.current) {
        orbRef.current.style.transform = `translate(${mx * -35}px, ${my * -30}px)`
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.transform = `translate(${mx * 25}px, ${my * 28}px)`
      }

      // Background layers: parallax via CSS custom properties
      if (sectionRef.current) {
        sectionRef.current.style.setProperty('--px', `${mx * 6}px`)
        sectionRef.current.style.setProperty('--py', `${my * 6}px`)
        sectionRef.current.style.setProperty('--px-inv', `${mx * -4}px`)
        sectionRef.current.style.setProperty('--py-inv', `${my * -4}px`)
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMouseMove)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Inicio de sesión exitoso')
      navigate('/')
    } catch (error) {
      const raw = error.response?.data?.error ?? error.response?.data?.message ?? error.message
      const msg = typeof raw === 'string' ? raw : 'Error al iniciar sesión'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      <section className={styles.section} ref={sectionRef}>
        <div className={styles.scanLine} />
        <div className={styles.orb} ref={orbRef} />
        <div className={styles.orb2} ref={orb2Ref} />

        <div className={styles.signin} ref={signinRef}>
          <div className={styles.content}>
            <div className={styles.logo}>
              <Truck size={36} />
              <h2>Control Vehicular</h2>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputBox}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder=" "
                  required
                  autoFocus
                />
                <label>Correo Electrónico</label>
              </div>

              <div className={styles.inputBox}>
                <input
                  type={showPassword ? 'text' : 'password'}
                      value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder=" "
                  required
                />
                <label>Contraseña</label>
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(prev => !prev)}
                  onMouseDown={e => e.preventDefault()}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} / >}
                </button>
              </div>

              <div className={styles.submitWrapper}>
                <button
                  type="submit"
                  className={styles.loginBtn}
                  disabled={loading}
                >
                  {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
