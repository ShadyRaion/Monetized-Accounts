import { Router } from 'express';
import * as ctrl from '../controllers/settings.controller.ts';
import * as faqCtrl from '../controllers/faq.controller.ts';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

router.get('/', ctrl.getSettings);
router.post('/upload-image', authenticate, requireAdmin, ctrl.uploadImage);
router.put('/', authenticate, requireAdmin, ctrl.updateSettings);

// FAQs under settings
router.get('/faqs', faqCtrl.listFaqs);
router.post('/faqs', authenticate, requireAdmin, faqCtrl.createFaq);
router.put('/faqs/:id', authenticate, requireAdmin, faqCtrl.updateFaq);
router.delete('/faqs/:id', authenticate, requireAdmin, faqCtrl.deleteFaq);

export default router;



