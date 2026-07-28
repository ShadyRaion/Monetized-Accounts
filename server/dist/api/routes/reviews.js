import { Router } from 'express';
import * as ctrl from "../controllers/review.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
router.post('/', authenticate, ctrl.createReview);
router.get('/', ctrl.listReviews);
router.put('/:id', authenticate, ctrl.updateReview);
router.delete('/:id', authenticate, ctrl.deleteReview);
export default router;
//# sourceMappingURL=reviews.js.map