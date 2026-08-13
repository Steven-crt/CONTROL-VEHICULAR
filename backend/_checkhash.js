const b = require('bcryptjs');
const h = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
console.log('hash:', h);
for (const p of ['password', 'admin123', '123456', 'admin', 'admin1234', 'parqueo', 'control', 'Control123', 'Admin123', 'password123']) {
  console.log(p + ':', b.compareSync(p, h));
}
