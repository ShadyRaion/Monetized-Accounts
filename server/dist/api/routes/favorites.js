import { Router } from 'express';
import * as ctrl from "../controllers/favorite.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
router.post('/', authenticate, ctrl.addFavorite);
router.get('/', authenticate, ctrl.listFavorites);
router.delete('/:productId', authenticate, ctrl.removeFavorite);
export default router;
//# sourceMappingURL=favorites.js.map