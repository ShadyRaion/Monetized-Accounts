import { Router } from 'express';
import * as ctrl from "../controllers/subscriber.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.middleware.js";
const router = Router();
router.get('/', ctrl.listSubscribers);
router.post('/', optionalAuthenticate, ctrl.createSubscriber);
router.delete('/:id', authenticate, ctrl.deleteSubscriber);
export default router;
//# sourceMappingURL=subscribers.js.map