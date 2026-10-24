import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { listUsers, getUser, updateMe } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CHIP_LIST_MAX, CHIP_MAX_LENGTH } from '../utils/chips.js';

const router = Router();
// Everything under /api/users requires being logged in.
router.use(protect);
const chipField = (name) => body(name)
  .optional({ values: 'falsy' })
  .default([])
  .custom((value) => {
    if (!Array.isArray(value)) throw new Error('Provide a list of tags');
    if (value.length > CHIP_LIST_MAX) throw new Error(`Use at most ${CHIP_LIST_MAX}`);
    for (const chip of value) {
      if (typeof chip !== 'string' || chip.trim().length === 0 || chip.trim().length > CHIP_MAX_LENGTH) {
        throw new Error(`Each tag must be 1–${CHIP_MAX_LENGTH} characters`);
      }
    }
    return true;
  });

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  query('skill').optional().trim().isString().isLength({ max: 40 }).withMessage('skill filter is too long'),
  query('search').optional().trim().isString().isLength({ max: 60 }).withMessage('search term is too long'),
  validate,
  listUsers
);

router.get('/:id', param('id').isMongoId().withMessage('Invalid user id'), validate, getUser);

router.put(
  '/me',
  body('name').optional().trim().isString().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('department')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 2, max: 60 })
    .withMessage('Department must be 2–60 characters'),
  chipField('skills'),
  chipField('interests'),
  body('bio').optional().trim().isString().isLength({ max: 500 }).withMessage('Bio must be at most 500 characters'),
  validate,
  updateMe
);

export default router;
