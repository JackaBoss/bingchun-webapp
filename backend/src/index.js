require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const authRoutes    = require('./routes/auth');
const menuRoutes    = require('./routes/menu');
const orderRoutes   = require('./routes/orders');
const pointRoutes   = require('./routes/points');
const adminRoutes   = require('./routes/admin');
const voucherRoutes = require('./routes/vouchers');
const outletRoutes  = require('./routes/outlets');

const app  = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : null);

app.use(cors({
  origin: allowedOrigins
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: ${origin} not allowed`));
      }
    : '*',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

app.use('/api/auth',    authRoutes);
app.use('/api/menu',    menuRoutes);
app.use('/api/orders',  orderRoutes);
app.use('/api/points',  pointRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api',         voucherRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});