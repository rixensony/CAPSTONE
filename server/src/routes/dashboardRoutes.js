import { Router } from 'express';
import { dashboard } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', dashboard);

export default router;
