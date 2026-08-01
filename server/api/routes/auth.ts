import { Router } from 'express';
import { register, login, loginWithGoogle, logout, getProfile, updateProfile, changePassword } from '../controllers/auth.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';

const router = Router();

// Define authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/login/google', loginWithGoogle);
router.post('/logout', logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

export default router;

