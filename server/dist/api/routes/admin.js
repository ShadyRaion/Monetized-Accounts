import { Router } from 'express';
import { authenticate, requireAdmin } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/admin.controller.js";
const router = Router();
router.get('/stats', authenticate, requireAdmin, ctrl.getStats);
router.get('/users', authenticate, requireAdmin, ctrl.listUsers);
router.get('/customers', authenticate, requireAdmin, ctrl.listCustomers);
router.put('/users/:id/ban', authenticate, requireAdmin, ctrl.banUser);
router.put('/users/:id/unban', authenticate, requireAdmin, ctrl.unbanUser);
router.post('/run-auto-complete', authenticate, requireAdmin, ctrl.autoCompleteOrders);
router.delete('/users/:id', authenticate, requireAdmin, ctrl.deleteUser);
// Blacklist management
router.get('/blacklist', authenticate, requireAdmin, ctrl.listBlacklist);
router.post('/blacklist', authenticate, requireAdmin, ctrl.addToBlacklist);
router.delete('/blacklist/:id', authenticate, requireAdmin, ctrl.removeFromBlacklist);
export default router;
//# sourceMappingURL=admin.js.map