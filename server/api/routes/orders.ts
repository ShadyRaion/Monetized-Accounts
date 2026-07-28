import { Router } from 'express';
import * as ctrl from '../controllers/order.controller.ts';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

router.use((req, res, next) => {
	// Dev logging removed as part of cleanup
	next();
});

router.post('/', authenticate, ctrl.createOrder);
router.get('/me', authenticate, ctrl.getUserOrders);
router.get('/:id', authenticate, ctrl.getOrder);

// Admin
router.get('/', authenticate, requireAdmin, ctrl.adminListOrders);
router.put('/:id/status', authenticate, ctrl.updateOrderStatus);
// Temp: log any requests reaching the delivery path to help debug 404
router.all('/:id/delivery', (req, res, next) => {
	// eslint-disable-next-line no-console
	console.log('[orders] delivery route hit:', req.method, req.baseUrl, req.path);
	next();
});

router.put('/:id/delivery', authenticate, requireAdmin, ctrl.adminUpdateOrderDelivery);

export default router;



