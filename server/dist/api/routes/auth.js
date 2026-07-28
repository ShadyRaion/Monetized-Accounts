import { Router } from 'express';
import { register, login, logout, getProfile, updateProfile, changePassword } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = Router();
// Define authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
export default router;
//# sourceMappingURL=auth.js.map