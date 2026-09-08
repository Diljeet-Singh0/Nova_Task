import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireTeamMembership, requireAdmin } from '../middleware/team';
import { validate } from '../middleware/validate';
import {
  createTeam,
  listMyTeams,
  getTeam,
  listMembers,
  removeMember,
  createInvitation,
  acceptInvitation,
  getInvitationPreview,
  createTeamSchema,
  createInviteSchema,
} from '../controllers/team.controller';

const router = Router();

router.post('/invitations/:token/accept', authenticate, acceptInvitation);
router.get('/invitations/:token', getInvitationPreview);

router.use(authenticate);

router.get('/', listMyTeams);
router.post('/', validate(createTeamSchema), createTeam);

router.get('/:teamId', requireTeamMembership, getTeam);

router.get('/:teamId/members', requireTeamMembership, listMembers);
router.delete(
  '/:teamId/members/:userId',
  requireTeamMembership,
  requireAdmin,
  removeMember
);

router.post(
  '/:teamId/invitations',
  requireTeamMembership,
  requireAdmin,
  validate(createInviteSchema),
  createInvitation
);

export default router;
