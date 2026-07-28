import { Router } from 'express';
import * as ctrl from '../controllers/payouts.controller.ts';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

router.get('/affiliate-purchases', authenticate, requireAdmin, ctrl.listAffiliatePurchases);
router.put('/affiliate-purchases/:id/paid', authenticate, requireAdmin, ctrl.markPurchasePaid);

export default router;



