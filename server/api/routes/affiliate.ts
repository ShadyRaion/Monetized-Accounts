import { Router } from 'express';
import * as ctrl from '../controllers/affiliate.controller.ts';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

// User
router.post('/apply', authenticate, ctrl.applyAffiliate);
router.get('/me', authenticate, ctrl.getAffiliateDashboard);

// Dev helper routes removed during cleanup

// User update own affiliate payment settings
router.put('/me', authenticate, ctrl.updateMyAffiliate);
router.put('/me/update', authenticate, ctrl.updateMyAffiliate);

// Admin
router.get('/', authenticate, requireAdmin, ctrl.adminListAffiliates);
router.put('/:userId', authenticate, requireAdmin, ctrl.adminUpdateAffiliate);
router.post('/:userId/pay', authenticate, requireAdmin, ctrl.adminPayAffiliate);

export default router;



