import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireTeamMembership, requireProjectAccess } from '../middleware/team';
import { validate } from '../middleware/validate';
import {
  listProjects,
  createProject,
  updateProject,
  getMyTasks,
  createProjectSchema,
  updateProjectSchema,
} from '../controllers/project.controller';

const router = Router();

router.use(authenticate);

router.get('/me/tasks', getMyTasks);

router.get('/teams/:teamId/projects', requireTeamMembership, listProjects);
router.post(
  '/teams/:teamId/projects',
  requireTeamMembership,
  validate(createProjectSchema),
  createProject
);

router.patch(
  '/projects/:projectId',
  requireProjectAccess,
  validate(updateProjectSchema),
  updateProject
);

export default router;
