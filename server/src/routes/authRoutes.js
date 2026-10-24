import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CHIP_LIST_MAX, CHIP_MAX_LENGTH } from '../utils/chips.js';

const router = Router();

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

const passwordRule = () => body('password')
  .isString()
  .isLength({ min: 8, max: 64 })
  .withMessage('Password must be 8–64 characters')
  .matches(/[A-Za-z]/)
  .withMessage('Password must include at least one letter')
  .matches(/\d/)
  .withMessage('Password must include at least one number');

// Routes are thin here: HTTP shapes in, validated data out, logic in controllers.
router.post(
  '/register',
  body('name').trim().isString().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
  body('email').trim().normalizeEmail({ gmail_remove_dots: false }).isEmail().withMessage('Provide a valid email'),
  passwordRule(),
  body('department')
    .trim()
    .isString()
    .isLength({ min: 2, max: 60 })
    .withMessage('Department must be 2–60 characters'),
  chipField('skills'),
  chipField('interests'),
  body('bio').optional({ values: 'falsy' }).trim().isString().isLength({ max: 500 }).withMessage('Bio must be at most 500 characters'),
  validate,
  register
);

router.post(
  '/login',
  body('email').trim().normalizeEmail({ gmail_remove_dots: false }).isEmail().withMessage('Provide a valid email'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
  login
);

router.get('/me', protect, getMe);

export default router;
