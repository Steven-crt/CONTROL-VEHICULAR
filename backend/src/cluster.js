

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

  require('./server');
}