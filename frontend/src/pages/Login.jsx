import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useConfig } from '../contexts/ConfigContext';
import { Car, Eye, EyeOff } from 'lucide-react';
import styled from 'styled-components';
import Loader from '../components/Loader';

function isSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const v = url.trim();
  if (/^\s*javascript:/i.test(v) || /^\s*data:text\/html/i.test(v)) return false;
  if (v.startsWith('data:image/')) return true;
  try {
    const u = new URL(v, window.location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'data:';
  } catch { return false; }
}

export default function Login() {
  const { config } = useConfig();
  const [form, setForm] = useState({ username: '', password: '', website: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  // Estado del flujo 2FA
  const [paso2FA, setPaso2FA] = useState(null); // { firma2FA, usuario }
  const [codigo2FA, setCodigo2FA] = useState('');
  const [cargando2FA, setCargando2FA] = useState(false);
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W, H;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let mouse = { x: W * 0.5, y: H * 0.5, active: false, targetX: W * 0.5, targetY: H * 0.5 };
    function onMouseMove(x, y) { mouse.targetX = x; mouse.targetY = y; mouse.active = true; }
    canvas.addEventListener('mousemove', e => onMouseMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', () => { mouse.active = false; });
    canvas.addEventListener('touchstart', e => { e.preventDefault(); onMouseMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); onMouseMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('touchend', () => { mouse.active = false; });

    const focalLength = 600, cameraZ = -400;
    function project(x, y, z) {
      let dz = z - cameraZ;
      if (dz < 1) dz = 1;
      const scale = focalLength / dz;
      return { sx: W * 0.5 + x * scale, sy: H * 0.5 + y * scale, scale, depth: dz };
    }

    function chromeColor(normalAngle, ribbonHue, depth) {
      const t = normalAngle;
      const specular = Math.pow(Math.sin(t * Math.PI), 2.5);
      const hueShift = ribbonHue + t * 2.0;
      const band = t * 5.0 + hueShift * 0.3;
      const pink = Math.max(0, Math.sin(band * 0.8) * 0.5 + 0.5);
      const cyan = Math.max(0, Math.sin(band * 0.8 + 2.5) * 0.5 + 0.5);
      const purple = Math.max(0, Math.sin(band * 0.8 + 4.5) * 0.5 + 0.5);
      let r = 0.08 + specular * (0.5 * pink + 0.3 * purple + 0.2);
      let g = 0.03 + specular * (0.6 * cyan + 0.1 * pink);
      let b = 0.1 + specular * (0.5 * cyan + 0.4 * purple + 0.15);
      const highlight = Math.pow(specular, 3.0);
      r += highlight * 1.0; g += highlight * 0.4; b += highlight * 0.7;
      const rim = Math.pow(1.0 - specular, 2.5) * 0.4;
      r += rim * 0.1; g += rim * 0.8; b += rim * 1.0;
      const fogAmount = Math.max(0, Math.min(1, (depth - 200) / 800));
      r = r * (1 - fogAmount * 0.7) + 0.02 * fogAmount;
      g = g * (1 - fogAmount * 0.6) + 0.03 * fogAmount;
      b = b * (1 - fogAmount * 0.4) + 0.08 * fogAmount;
      return { r: Math.max(0, Math.min(1, r)) * 255, g: Math.max(0, Math.min(1, g)) * 255, b: Math.max(0, Math.min(1, b)) * 255 };
    }

    const BASE_RIBBON_COUNT = 5;
    let ribbonDefs = [];
    function initRibbons() {
      ribbonDefs = [];
      const count = Math.max(2, BASE_RIBBON_COUNT);
      for (let i = 0; i < count; i++) {
        ribbonDefs.push({
          phaseX: Math.random() * Math.PI * 2, phaseY: Math.random() * Math.PI * 2, phaseZ: Math.random() * Math.PI * 2,
          freqX: 0.25 + Math.random() * 0.5, freqY: 0.2 + Math.random() * 0.35, freqZ: 0.15 + Math.random() * 0.3,
          ampX: 250 + Math.random() * 300, ampY: 120 + Math.random() * 200, ampZ: 100 + Math.random() * 200,
          twistFreq: 1.2 + Math.random() * 2.5, twistPhase: Math.random() * Math.PI * 2,
          hue: (i / count) * Math.PI * 2 + Math.random() * 0.5, baseWidth: 35 + Math.random() * 50,
          segments: 90, speed: 0.25 + Math.random() * 0.35, zOffset: (i - count * 0.5) * 100
        });
      }
    }
    initRibbons();

    function drawBackground() {
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
      grad.addColorStop(0, '#14101a');
      grad.addColorStop(0.5, '#0d0a12');
      grad.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(60, 30, 80, 0.04)';
      ctx.lineWidth = 0.5;
      const gridSize = 50;
      ctx.beginPath();
      for (let x = 0; x < W; x += gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y < H; y += gridSize) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    }

    let time = 0;
    let running = true;
    let rafId = null;

    function draw() {
      if (!running) return;
      time += 0.012;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;
      const mouseInfluenceX = mouse.active ? (mouse.x - W * 0.5) * 0.05 : 0;
      const mouseInfluenceY = mouse.active ? (mouse.y - H * 0.5) * 0.03 : 0;
      drawBackground();

      const allSegments = [];
      for (let ri = 0; ri < ribbonDefs.length; ri++) {
        const rb = ribbonDefs[ri];
        const tSpeed = time * rb.speed;
        const attractX = mouse.active ? (mouse.x - W * 0.5) * 0.5 : 0;
        const attractY = mouse.active ? (mouse.y - H * 0.5) * 0.5 : 0;
        const spinePoints = [];
        for (let s = 0; s <= rb.segments; s++) {
          const t0 = s / rb.segments;
          const param = (t0 - 0.5) * 2.0;
          let px = Math.sin(param * 3.0 * rb.freqX + rb.phaseX + tSpeed * 0.7) * rb.ampX;
          let py = Math.sin(param * 2.5 * rb.freqY + rb.phaseY + tSpeed * 0.5) * rb.ampY;
          let pz = param * 500 + rb.zOffset + Math.sin(param * 2.0 * rb.freqZ + rb.phaseZ + tSpeed * 0.3) * rb.ampZ + 500;
          if (mouse.active) {
            const mouseDistFactor = 1.0 / (1.0 + Math.abs(pz - 300) * 0.003);
            px += attractX * mouseDistFactor * 0.3;
            py += attractY * mouseDistFactor * 0.3;
          }
          px -= mouseInfluenceX;
          py -= mouseInfluenceY;
          let twist = param * rb.twistFreq * 3.0 + tSpeed * 2.0 + rb.twistPhase;
          twist += Math.sin(param * 5.0 + tSpeed) * 0.5;
          let widthFactor = Math.cos(Math.abs(param) * Math.PI * 0.5);
          widthFactor = Math.max(0.02, widthFactor * widthFactor);
          const ribbonWidth = rb.baseWidth * widthFactor;
          spinePoints.push({
            x: px, y: py, z: pz,
            edgeX: Math.cos(twist) * ribbonWidth, edgeY: Math.sin(twist) * ribbonWidth,
            twist, param, widthFactor
          });
        }
        for (let s = 0; s < rb.segments; s++) {
          const p0 = spinePoints[s], p1 = spinePoints[s + 1];
          const a = project(p0.x - p0.edgeX, p0.y - p0.edgeY, p0.z);
          const b = project(p0.x + p0.edgeX, p0.y + p0.edgeY, p0.z);
          const c = project(p1.x + p1.edgeX, p1.y + p1.edgeY, p1.z);
          const d = project(p1.x - p1.edgeX, p1.y - p1.edgeY, p1.z);
          const avgDepth = (a.depth + b.depth + c.depth + d.depth) * 0.25;
          if (avgDepth < 10 || avgDepth > 1200) continue;
          const twistMid = (p0.twist + p1.twist) * 0.5;
          const normalAngle = Math.sin(twistMid) * 0.5 + 0.5;
          const col = chromeColor(normalAngle, rb.hue + time * 0.3, avgDepth);
          allSegments.push({
            ax: a.sx, ay: a.sy, bx: b.sx, by: b.sy, cx: c.sx, cy: c.sy, dx: d.sx, dy: d.sy,
            col, depth: avgDepth, normalAngle, widthFactor: (p0.widthFactor + p1.widthFactor) * 0.5
          });
        }
      }

      allSegments.sort((a, b) => b.depth - a.depth);

      for (let i = 0; i < allSegments.length; i++) {
        const seg = allSegments[i];
        const depthAlpha = Math.max(0.2, 1.0 - (seg.depth - 100) / 1000);
        const alpha = depthAlpha * (0.6 + seg.widthFactor * 0.4);
        ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
        ctx.fillStyle = 'rgb(' + Math.round(seg.col.r) + ',' + Math.round(seg.col.g) + ',' + Math.round(seg.col.b) + ')';
        ctx.beginPath();
        ctx.moveTo(seg.ax, seg.ay);
        ctx.lineTo(seg.bx, seg.by);
        ctx.lineTo(seg.cx, seg.cy);
        ctx.lineTo(seg.dx, seg.dy);
        ctx.closePath();
        ctx.fill();
        if (seg.normalAngle > 0.3 && seg.normalAngle < 0.7) {
          const specIntensity = Math.pow(Math.max(0, 1.0 - Math.abs(seg.normalAngle - 0.5) * 3.0), 1.5);
          if (specIntensity > 0.05) {
            ctx.globalAlpha = specIntensity * alpha * 0.5;
            ctx.strokeStyle = 'rgba(255, 230, 255, 0.7)';
            ctx.lineWidth = 2.0 * (1.0 - seg.depth / 1200);
            ctx.beginPath();
            ctx.moveTo((seg.ax + seg.bx) * 0.5, (seg.ay + seg.by) * 0.5);
            ctx.lineTo((seg.cx + seg.dx) * 0.5, (seg.cy + seg.dy) * 0.5);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(draw);
    }

    drawBackground();
    rafId = requestAnimationFrame(draw);

    const onVisChange = () => { running = !document.hidden; if (running && !rafId) rafId = requestAnimationFrame(draw); };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Honeypot: si el campo oculto viene lleno, es un bot — no enviar nada
    if (form.website) return;
    setLoading(true);
    try {
      const data = await login(form.username, form.password);
      // Si requiere 2FA, cambiar a la vista de código sin navegar todavía
      if (data?.requiere2FA) {
        setPaso2FA({ firma2FA: data.firma2FA, usuario: data.usuario });
        return;
      }
      toast.success('¡Listo! Bienvenido.');
      // Navegar a la vista principal según el rol para evitar redirecciones extra
      const rolNav = data?.usuario?.rol;
      const destino = (rolNav === 'admin' || rolNav === '1') ? '/dashboard' : '/vehiculos';
      navigate(destino);
    } catch (err) {
      if (!err.response) {
        toast.error('No se pudo conectar con el servidor. Verifica que esté activo.');
      } else {
        toast.error(err.response?.data?.error || 'Credenciales inválidas');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleVerify2FA = async (e) => {
    e.preventDefault();
    if (!paso2FA?.firma2FA || !codigo2FA.trim()) return;
    setCargando2FA(true);
    try {
      const data = await verify2FA(paso2FA.firma2FA, codigo2FA);
      toast.success('¡Listo! Bienvenido.');
      const rolNav = data?.usuario?.rol;
      const destino = (rolNav === 'admin' || rolNav === '1') ? '/dashboard' : '/vehiculos';
      navigate(destino);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Código de verificación incorrecto');
      setCodigo2FA('');
    } finally {
      setCargando2FA(false);
    }
  };

  // Volver al login si el usuario se equivocó de cuenta
  const volverAlLogin = () => {
    setPaso2FA(null);
    setCodigo2FA('');
  };

  return (
    <StyledWrapper className="notranslate" translate="no">
      <canvas ref={canvasRef} className="ribbon-canvas" />
      <div className="login-wrapper">
        <div className="login-card">
          <div className="glow-blob blob-1" />
          <div className="glow-blob blob-2" />
          <div className="dark-overlay" />
          <div className="view-container">
            <div className="form-view">
              {paso2FA ? (
                <>
                  <div className="header">
                    <div className="logo-container">
                      {config?.logo_url && isSafeImageUrl(config.logo_url) ? (
                        <img src={config.logo_url} alt="Logo" className="logo-img" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <Car className="logo-icon" />
                      )}
                    </div>
                    <div className="title">Verificación en dos pasos</div>
                    <p className="subtitle">
                      {paso2FA.usuario?.nombre || paso2FA.usuario?.username || 'Bienvenido'} — ingresa el código de 6 dígitos de tu app de autenticación.
                    </p>
                  </div>
                  <form onSubmit={handleVerify2FA}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="input-field otp-input"
                        placeholder="Código de 6 dígitos"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={codigo2FA}
                        onChange={e => setCodigo2FA(e.target.value.replace(/[^0-9]/g, ''))}
                        required
                        autoFocus
                      />
                    </div>
                    {cargando2FA ? (
                      <div className="loader-container">
                        <Loader />
                        <span className="loader-text">Verificando código...</span>
                      </div>
                    ) : (
                      <button type="submit" className="btn-submit" disabled={codigo2FA.length !== 6}>
                        Verificar
                      </button>
                    )}
                    <button type="button" className="btn-back" onClick={volverAlLogin} disabled={cargando2FA}>
                      ← Volver al inicio de sesión
                    </button>
                  </form>
                </>
              ) : (
              <>
              <div className="header">
                <div className="logo-container">
                  {config?.logo_url && isSafeImageUrl(config.logo_url) ? (
                    <img src={config.logo_url} alt="Logo" className="logo-img" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <Car className="logo-icon" />
                  )}
                </div>
                <div className="title">{config?.nombre_negocio || 'Control Vehicular'}</div>
                <p className="subtitle">Ingresa para gestionar tu flota.</p>
              </div>
              <form onSubmit={handleSubmit}>
                {/* Honeypot anti-bots: invisible para humanos, bots lo rellenan */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                  <label>No llenar este campo</label>
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    name="website"
                    value={form.website}
                    onChange={e => setForm({ ...form, website: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nombre de usuario"
                    autoComplete="username"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="input-group password-group">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {loading ? (
                  <div className="loader-container">
                    <Loader />
                    <span className="loader-text">Verificando...</span>
                  </div>
                ) : (
                  <button type="submit" className="btn-submit">Iniciar Sesión</button>
                )}
              </form>

              <p className="footer-text">
                © {new Date().getFullYear()} {config?.nombre_negocio || 'Control Vehicular'}. Todos los derechos reservados.
              </p>
              </>
              )}
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .ribbon-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    pointer-events: auto;
  }

  .login-wrapper,
  .login-wrapper * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
      Arial, sans-serif;
  }

  .login-wrapper {
    --blob-1-color: #f59e0b;
    --blob-2-color: #3b82f6;
    --btn-hover-glow: rgba(245, 158, 11, 0.25);
    --input-focus-glow: rgba(245, 158, 11, 0.12);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: transparent;
    position: relative;
    z-index: 1;
    overflow: hidden;
    animation: floatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: translateY(30px);
  }

  @keyframes floatUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .login-card {
    position: relative;
    width: 360px;
    background: rgba(19, 32, 64, 0.65);
    border-radius: 24px;
    padding: 36px 28px;
    overflow: hidden;
    backdrop-filter: blur(24px) saturate(1.4);
    -webkit-backdrop-filter: blur(24px) saturate(1.4);
    border: 1px solid rgba(255, 255, 255, 0.07);
    box-shadow:
      0 24px 48px rgba(0, 0, 0, 0.35),
      0 8px 16px rgba(0, 0, 0, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition:
      transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .login-wrapper:hover .login-card {
    transform: translateY(-6px);
    box-shadow:
      0 32px 64px rgba(0, 0, 0, 0.3),
      0 12px 24px rgba(0, 0, 0, 0.15);
  }

  .glow-blob {
    position: absolute;
    filter: blur(45px);
    border-radius: 50%;
    z-index: 0;
    opacity: 0.6;
    animation: pulseGlow 4s infinite alternate ease-in-out;
    transition:
      opacity 0.5s ease,
      filter 0.5s ease;
  }

  .login-wrapper:hover .glow-blob {
    opacity: 0.75;
    filter: blur(40px);
  }

  .blob-1 {
    top: -30px;
    right: -30px;
    width: 170px;
    height: 170px;
    background: var(--blob-1-color);
  }

  .blob-2 {
    bottom: -50px;
    left: -50px;
    width: 210px;
    height: 210px;
    background: var(--blob-2-color);
    animation-delay: -2s;
  }

  @keyframes pulseGlow {
    0% {
      transform: scale(0.9);
      opacity: 0.5;
    }
    100% {
      transform: scale(1.1);
      opacity: 0.7;
    }
  }

  .dark-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(5, 5, 8, 0.5) 30%,
      transparent 100%
    );
    z-index: 1;
    box-shadow: inset 0 0 0 1px rgba(30, 58, 95, 0.25);
    border-radius: inherit;
  }

  .view-container {
    position: relative;
    z-index: 10;
  }

  .form-view {
    display: flex;
    flex-direction: column;
    animation: fadeInView 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeInView {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .header {
    margin-bottom: 28px;
    text-align: center;
  }

  .logo-container {
    width: 60px;
    height: 60px;
    margin: 0 auto 16px auto;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    background: rgba(245, 158, 11, 0.08);
  }

  .logo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .logo-icon {
    width: 30px;
    height: 30px;
    color: #f59e0b;
  }

  .title {
    color: #ffffff;
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }

  .subtitle {
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    font-weight: 400;
  }

  .input-group {
    margin-bottom: 16px;
    position: relative;
  }

  .input-field {
    width: 100%;
    padding: 1.05em 1.2em;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    color: #ffffff;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .input-field::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .input-field:focus {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 20px var(--input-focus-glow);
    transform: translateY(-2px);
  }

  .password-group .input-field {
    padding-right: 44px;
  }

  .toggle-pass {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 4px;
    display: flex;
    transition: color 0.2s;
  }

  .toggle-pass:hover {
    color: rgba(255, 255, 255, 0.8);
  }

  .btn-submit {
    width: 100%;
    padding: 1em;
    background: #f59e0b;
    color: #0b1220;
    border: none;
    border-radius: 12px;
    font-size: 14.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .btn-submit:hover {
    background: #fbbf24;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px var(--btn-hover-glow);
  }

  .btn-submit:active {
    transform: translateY(0);
  }

  .otp-input {
    text-align: center;
    font-size: 22px;
    letter-spacing: 8px;
    font-weight: 600;
  }

  .btn-back {
    width: 100%;
    margin-top: 12px;
    padding: 0.8em;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    border: none;
    border-radius: 12px;
    font-size: 12.5px;
    font-family: inherit;
    cursor: pointer;
    transition: color 0.2s;
  }

  .btn-back:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.9);
  }

  .btn-back:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .loader-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
    gap: 8px;
  }

  .loader-text {
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
  }

  .footer-text {
    margin-top: 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.3);
    font-size: 11px;
  }
`;
