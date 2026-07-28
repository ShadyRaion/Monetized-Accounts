import { Router } from 'express'
import * as ctrl from '../controllers/faq.controller.ts'
import { authenticate, requireAdmin } from '../middleware/auth.middleware.ts'

const router = Router()

router.get('/', ctrl.listFaqs)
router.post('/', authenticate, requireAdmin, ctrl.createFaq)
router.put('/:id', authenticate, requireAdmin, ctrl.updateFaq)
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteFaq)

export default router
