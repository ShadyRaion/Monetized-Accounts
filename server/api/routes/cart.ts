import { Router } from 'express';
import * as ctrl from '../controllers/cart.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/', authenticate, ctrl.addToCart);
router.get('/', authenticate, ctrl.getCart);
router.delete('/:id', authenticate, ctrl.removeFromCart);
router.put('/:id', authenticate, ctrl.updateCartItem);
router.post('/checkout', authenticate, ctrl.checkoutCart);

export default router;



