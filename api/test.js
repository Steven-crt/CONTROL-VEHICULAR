module.exports = (req, res) => {
  res.json({ ok: true, env: process.env.VERCEL ? 'vercel' : 'local', node: process.version });
};
