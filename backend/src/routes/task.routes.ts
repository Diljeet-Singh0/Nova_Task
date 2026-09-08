import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireProjectAccess, requireTaskAccess } from '../middleware/team';
import { validate } from '../middleware/validate';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  listComments,
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema,
} from '../controllers/task.controller';

const router = Router();

router.use(authenticate);

router.get('/projects/:projectId/tasks', requireProjectAccess, listTasks);
router.post(
  '/projects/:projectId/tasks',
  requireProjectAccess,
  validate(createTaskSchema),
  createTask
);

router.get('/tasks/:taskId', requireTaskAccess, getTask);
router.patch(
  '/tasks/:taskId',
  requireTaskAccess,
  validate(updateTaskSchema),
  updateTask
);
router.delete('/tasks/:taskId', requireTaskAccess, deleteTask);

router.get('/tasks/:taskId/comments', requireTaskAccess, listComments);
router.post(
  '/tasks/:taskId/comments',
  requireTaskAccess,
  validate(addCommentSchema),
  addComment
);

export default router;
