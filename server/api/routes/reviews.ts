import { Router } from 'express';
import * as ctrl from '../controllers/review.controller.ts';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/', authenticate, ctrl.createReview);
router.get('/', ctrl.listReviews);
router.put('/:id', authenticate, ctrl.updateReview);
router.delete('/:id', authenticate, ctrl.deleteReview);

export default router;



