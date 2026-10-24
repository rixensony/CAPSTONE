import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  sendRequest,
  incomingRequests,
  myRequests,
  respondToRequest,
  cancelRequest,
} from '../controllers/requestController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.post(
  '/',
  body('projectId').isMongoId().withMessage('Provide a valid project id'),
  body('message').optional({ values: 'falsy' }).trim().isString().isLength({ max: 300 }).withMessage('Message must be at most 300 characters'),
  validate,
  sendRequest
);

router.get(
  '/incoming',
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  query('status').optional({ values: 'falsy' }).isIn(['pending', 'accepted', 'rejected']).withMessage('Invalid status filter'),
  validate,
  incomingRequests
);

router.get(
  '/mine',
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  validate,
  myRequests
);

router.patch(
  '/:id',
  param('id').isMongoId().withMessage('Invalid request id'),
  body('status').isIn(['accepted', 'rejected']).withMessage('Status must be accepted or rejected'),
  validate,
  respondToRequest
);

router.delete('/:id', param('id').isMongoId().withMessage('Invalid request id'), validate, cancelRequest);

export default router;
