import { Router } from 'express';
import * as ctrl from '../controllers/ticket.controller.ts';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/', authenticate, ctrl.createTicket);
router.get('/me', authenticate, ctrl.getUserTickets);
router.post('/:ticketId/messages', authenticate, ctrl.addMessage);
router.put('/:id', authenticate, ctrl.updateTicket);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteTicket);

// Admin
router.get('/', authenticate, requireAdmin, ctrl.adminListTickets);
router.put('/:id/close', authenticate, requireAdmin, ctrl.adminCloseTicket);
router.put('/:id/reopen', authenticate, requireAdmin, ctrl.adminReopenTicket);

// Admin-only: reset messaging (destructive)
router.post('/admin/reset', authenticate, requireAdmin, ctrl.adminResetMessaging);

export default router;



