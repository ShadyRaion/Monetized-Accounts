import { Router } from 'express';
import * as ctrl from '../controllers/favorite.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/', authenticate, ctrl.addFavorite);
router.get('/', authenticate, ctrl.listFavorites);
router.delete('/:productId', authenticate, ctrl.removeFavorite);

export default router;



