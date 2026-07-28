import { Router } from 'express';
import * as ctrl from "../controllers/payouts.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";
const router = Router();
router.get('/affiliate-purchases', authenticate, requireAdmin, ctrl.listAffiliatePurchases);
router.put('/affiliate-purchases/:id/paid', authenticate, requireAdmin, ctrl.markPurchasePaid);
export default router;
//# sourceMappingURL=payouts.js.map