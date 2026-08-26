const db = require('../db');

let cache = null;
let promise = null;

async function getRolColumn() {
  if (cache) return cache;
  if (!promise) {
    promise = (async () => {
      const [rows] = await db.query(
        "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS " +
        "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME IN ('rol_id','rol')"
      );
      const map = {};
      rows.forEach(r => { map[r.COLUMN_NAME] = r.DATA_TYPE; });
      cache = {
        name: map['rol_id'] ? 'rol_id' : (map['rol'] ? 'rol' : null),
        isInt: !!map['rol_id'] && ['int', 'bigint', 'smallint', 'tinyint', 'mediumint'].includes(map['rol_id'])
      };
      return cache;
    })();
  }
  return promise;
}

async function rolValueToStore(rol) {
  const col = await getRolColumn();
  if (!col.name) return null;
  const r = String(rol ?? '').trim().toLowerCase();
  if (col.isInt) {
    // admin=1, empleado=2. Legacy (operador/cajero, ids 2/3) también resuelve a empleado.
    const map = { admin: 1, empleado: 2 };
    if (r === '1') return 1;
    if (['2', '3', '4'].includes(r)) return 2;
    return map[r] ?? null;
  }
  // Columna de texto: aceptar legacy y devolver siempre el rol unificado
  if (r === 'operador' || r === 'cajero' || r === '2' || r === '3') return 'empleado';
  return r;
}

module.exports = { getRolColumn, rolValueToStore };
