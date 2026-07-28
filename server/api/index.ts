import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.ts';
import productsRoutes from './routes/products.ts';
import ordersRoutes from './routes/orders.ts';
import ticketsRoutes from './routes/tickets.ts';
import * as ticketCtrl from './controllers/ticket.controller.ts';
import affiliateRoutes from './routes/affiliate.ts';
import * as affiliateCtrl from './controllers/affiliate.controller.ts';
import adminRoutes from './routes/admin.ts';
import subscribersRoutes from './routes/subscribers.ts';
import reviewsRoutes from './routes/reviews.ts';
import settingsRoutes from './routes/settings.ts';
import favoritesRoutes from './routes/favorites.ts';
import cartRoutes from './routes/cart.ts';
import payoutsRoutes from './routes/payouts.ts';
import { authenticate, requireAdmin } from './middleware/auth.middleware.ts';
import { initSSE } from './sse.ts';
import cookieParser from 'cookie-parser';

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const app = express();
// Initialize server-sent events (SSE) endpoint for real-time notifications
initSSE(app)
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(cookieParser());
// Handle binary uploads before JSON parsing so image files reach the controller intact.
app.use(express.raw({
  type: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/octet-stream'],
  limit: '50mb'
}));
// Capture raw request body for debugging (stored on req.rawBody)
app.use(express.json({
  limit: '50mb',
  verify: (req: any, res, buf: Buffer) => {
    try {
      req.rawBody = buf.toString();
    } catch (e) {
      req.rawBody = undefined;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  next();
});

// Dev-only helpers removed for cleanup

// Dev-only helper on apiApp to inspect raw body and headers for /api/dev/apply-affiliate
// Dev routes removed in production cleanup
app.use('/auth', authRoutes);
app.use('/products', productsRoutes);
app.use('/orders', ordersRoutes);
app.use('/tickets', ticketsRoutes);
// Ensure admin reset route is explicitly registered on the api app
app.post('/tickets/admin/reset', authenticate, requireAdmin, ticketCtrl.adminResetMessaging);
app.use('/affiliate', affiliateRoutes);
app.use('/subscribers', subscribersRoutes);
app.use('/admin/subscribers', authenticate, requireAdmin, subscribersRoutes);
app.use('/admin', adminRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/settings', settingsRoutes);
app.use('/favorites', favoritesRoutes);
app.use('/cart', cartRoutes);
app.use('/payouts', payoutsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

// 404 fallback: let express handle it without noisy logging
app.use((req, res, next) => { next(); });

// Handle JSON parse errors from express.json
app.use((err: any, req: any, res: any, next: any) => {
  if (err && err instanceof SyntaxError && 'body' in err) {
    console.error('Body parse error:', err.message);
    try { console.error('Body parse rawBody:', req && req.rawBody) } catch (e) {}
    return res.status(400).json({ message: 'Invalid JSON body', error: err.message });
  }
  if (err?.type === 'entity.too.large') {
    console.error('Body too large:', err.message);
    return res.status(413).json({ message: 'Request payload too large', error: err.message });
  }
  console.error('Express error handler:', err);
  res.status(500).json({ message: 'Internal server error', error: String(err?.message || err), stack: err?.stack });
});

export default app;

