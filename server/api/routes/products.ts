import { Router } from 'express';
import * as controller from '../controllers/product.controller.ts';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

router.get('/preview', controller.previewProducts);
router.get('/', controller.listProducts);
router.get('/:id', controller.getProduct);

// Admin CRUD
router.post('/', authenticate, requireAdmin, controller.createProduct);
router.put('/:id', authenticate, requireAdmin, controller.updateProduct);
router.delete('/:id', authenticate, requireAdmin, controller.deleteProduct);

export default router;



