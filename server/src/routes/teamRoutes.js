import { Router } from 'express';
import { param } from 'express-validator';
import { myTeams, getTeam, removeMember } from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.get('/mine', myTeams);

router.get('/:id', param('id').isMongoId().withMessage('Invalid team id'), validate, getTeam);

router.delete(
  '/:id/members/:memberId',
  param('id').isMongoId().withMessage('Invalid team id'),
  param('memberId').isMongoId().withMessage('Invalid member id'),
  validate,
  removeMember
);

export default router;
