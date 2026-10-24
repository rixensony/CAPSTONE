import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CHIP_LIST_MAX, CHIP_MAX_LENGTH } from '../utils/chips.js';

const router = Router();
// Explore Project / Manage Project — protected: only signed-in students browse.
router.use(protect);

const requiredSkillsRule = () => body('requiredSkills')
  .custom((value) => {
    if (!Array.isArray(value)) throw new Error('Provide a list of required skills');
    if (value.length < 1) throw new Error('List at least one required skill');
    if (value.length > CHIP_LIST_MAX) throw new Error(`Use at most ${CHIP_LIST_MAX} skills`);
    for (const chip of value) {
      if (typeof chip !== 'string' || chip.trim().length === 0 || chip.trim().length > CHIP_MAX_LENGTH) {
        throw new Error(`Each skill must be 1–${CHIP_MAX_LENGTH} characters`);
      }
    }
    return true;
  });

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('limit must be a positive integer'),
  query('status').optional({ values: 'falsy' }).isIn(['open', 'in-progress', 'full', 'completed']).withMessage('Invalid status filter'),
  query('sort').optional({ values: 'falsy' }).isIn(['newest', 'oldest', 'title']).withMessage('Invalid sort option'),
  query('skill').optional().trim().isString().isLength({ max: 40 }).withMessage('skill filter is too long'),
  query('search').optional().trim().isString().isLength({ max: 100 }).withMessage('search term is too long'),
  validate,
  listProjects
);

router.post(
  '/',
  body('title').trim().isString().isLength({ min: 5, max: 100 }).withMessage('Title must be 5–100 characters'),
  body('description')
    .trim()
    .isString()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be 20–2000 characters'),
  requiredSkillsRule(),
  body('teamSize').isInt({ min: 1, max: 9 }).withMessage('Teammates needed must be between 1 and 9'),
  body('status').not().exists().withMessage('New projects always start as open'),
  validate,
  createProject
);

router.get('/:id', param('id').isMongoId().withMessage('Invalid project id'), validate, getProject);

router.patch(
  '/:id',
  param('id').isMongoId().withMessage('Invalid project id'),
  body('title').optional().trim().isString().isLength({ min: 5, max: 100 }).withMessage('Title must be 5–100 characters'),
  body('description')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be 20–2000 characters'),
  body('teamSize').optional().isInt({ min: 1, max: 9 }).withMessage('Teammates needed must be between 1 and 9'),
  validate,
  updateProject
);

router.delete('/:id', param('id').isMongoId().withMessage('Invalid project id'), validate, deleteProject);

export default router;
