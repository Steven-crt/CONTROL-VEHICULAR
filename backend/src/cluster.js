/**
 * Arranque opcional en modo cluster (multi-core).
 *
 * USO:
 *   NODE_CLUSTER=1 node src/cluster.js
 *
 * - Sin la variable, NO hace nada distinto: importa server.js y arranca normal
 *   (comportamiento actual de Render, 1 proceso). CERO riesgo para el despliegue.
 * - Con NODE_CLUSTER=1: un worker por core (máx. 4). Cada worker tiene su propio
 *   pool MySQL y su propio rate-limit en memoria (por eso en Render free de
 *   512MB NO se recomienda activar: 4 workers × memoria de Node supera la RAM).
 *   Ideal cuando se suba a un plan pagado con más RAM/CPU.
 *
 * El login con bcrypt y la compresión gzip son CPU-bound: con cluster,
 * 2-4 núcleos reparten la carga en vez de saturar uno solo.
 */

const os = require('os');
const cluster = require('cluster');

const MODE = process.env.NODE_CLUSTER;

if (MODE && MODE !== '0' && MODE !== 'false') {
  const numWorkers = Math.min(parseInt(process.env.CLUSTER_WORKERS, 10) || os.cpus().length, 4);

  if (cluster.isPrimary) {
    console.log(`👨‍👩‍👧‍👦 Cluster: lanzando ${numWorkers} workers (NODE_CLUSTER=${MODE})`);
    for (let i = 0; i < numWorkers; i++) cluster.fork();

    cluster.on('exit', (worker, code, signal) => {
      console.warn(`💀 Worker ${worker.process.pid} murió (${signal || code}). Relanzando…`);
      cluster.fork();
    });
    console.log(`👨‍👩‍👧‍👦 Cluster: ${numWorkers} workers activos`);
  } else {
    require('./server');
  }
} else {
  // Modo normal (Render, sin cambios): un solo proceso
  require('./server');
}