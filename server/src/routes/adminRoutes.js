import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  adminStats,
  adminListUsers,
  adminSetRole,
  adminDeleteUser,
  adminDeleteProject,
} from '../controllers/adminController.js';
import { protect, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
// Two guards on every admin route: authenticated AND role=admin.
router.use(protect, requireAdmin);

router.get('/stats', adminStats);

router.get(
  '/users',
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  query('search').optional().trim().isString().isLength({ max: 80 }).withMessage('search term is too long'),
  validate,
  adminListUsers
);

router.patch(
  '/users/:id/role',
  param('id').isMongoId().withMessage('Invalid user id'),
  body('role').isIn(['student', 'admin']).withMessage('Role must be student or admin'),
  validate,
  adminSetRole
);

router.delete('/users/:id', param('id').isMongoId().withMessage('Invalid user id'), validate, adminDeleteUser);

router.delete('/projects/:id', param('id').isMongoId().withMessage('Invalid project id'), validate, adminDeleteProject);

export default router;
