import { Lock, Menu, ShieldCheck } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import styles from './Topbar.module.css'

export default function Topbar({ onMenuClick, title }) {
  const { usuario } = useAuthStore()

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <button className={styles.topbarMenuBtn} onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <h2 className={styles.topbarTitle}>{title || 'Panel Principal'}</h2>
      </div>
      <div className={styles.topbarRight}>
        <div className={styles.secureBadge} title="Tokens de sesion en almacenamiento temporal">
          <ShieldCheck size={16} />
          <span>Sesion protegida</span>
        </div>
        <div className={styles.topbarUser}>
          <div className={styles.topbarAvatar}>
            <Lock size={14} />
          </div>
          <div>
            <div className={styles.topbarName}>{usuario?.nombre?.charAt(0)}. {usuario?.apellido?.charAt(0)}.</div>
            <div className={styles.topbarRol}>{usuario?.rol}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
