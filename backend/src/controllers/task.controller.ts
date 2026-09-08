import { Request, Response } from 'express';
import { z } from 'zod';
import { TaskStatus, Priority, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.TODO),
  priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().datetime().or(z.string().date()).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z
    .string()
    .datetime()
    .or(z.string().date())
    .optional()
    .nullable()
    .or(z.null()),
});

export const addCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export async function listTasks(req: Request, res: Response) {
  if (!req.project) {
    res.status(404).json({ message: 'Project not found' });
    return;
  }

  const { status, priority, assigneeId, search } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      projectId: req.project.projectId,
      ...(status && typeof status === 'string' ? { status: status as TaskStatus } : {}),
      ...(priority && typeof priority === 'string' ? { priority: priority as Priority } : {}),
      ...(assigneeId && typeof assigneeId === 'string' && assigneeId !== 'all'
        ? assigneeId === 'none'
          ? { assigneeId: null }
          : { assigneeId }
        : {}),
      ...(search && typeof search === 'string'
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const tasksWithCounts = tasks.map((t) => ({
    ...t,
    _count: { comments: t.comments.length },
  }));

  res.json({ tasks: tasksWithCounts });
}

export async function getTask(req: Request, res: Response) {
  if (!req.task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const task = await prisma.task.findUnique({
    where: { id: req.task.taskId },
    include: {
      comments: {
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      project: { select: { id: true, name: true, teamId: true } },
    },
  });

  res.json({ task });
}

function parseDueDate(
  val: string | null | undefined
): Date | null | undefined {
  if (val === undefined) return undefined;
  if (val === null) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function createTask(req: Request, res: Response) {
  if (!req.project || !req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const data = req.body as z.infer<typeof createTaskSchema>;

  if (data.assigneeId) {
    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: req.project.teamId, userId: data.assigneeId },
      },
    });
    if (!member) {
      res.status(400).json({ message: 'Assignee is not a team member' });
      return;
    }
  }

  const dueDate = parseDueDate(data.dueDate as string | null | undefined);

  const task = await prisma.task.create({
    data: {
      projectId: req.project.projectId,
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId ?? null,
      dueDate,
      createdById: req.user.id,
    },
    include: { comments: { take: 1, orderBy: { createdAt: 'desc' } } },
  });

  res.status(201).json({
    task: {
      ...task,
      _count: { comments: task.comments.length },
    },
  });
}

export async function updateTask(req: Request, res: Response) {
  if (!req.task || !req.user) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const data = req.body as z.infer<typeof updateTaskSchema>;

  if (data.assigneeId !== undefined) {
    if (data.assigneeId !== null) {
      const member = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: { teamId: req.task.teamId, userId: data.assigneeId },
        },
      });
      if (!member) {
        res.status(400).json({ message: 'Assignee is not a team member' });
        return;
      }
    }
  }

  const isAdmin = req.task.membership.role === Role.ADMIN;
  const isCreator = req.task.task.createdById === req.user.id;
  const isAssignee = req.task.task.assigneeId === req.user.id;

  if (!isAdmin && !isCreator && !isAssignee) {
    res.status(403).json({ message: 'Not allowed to modify this task' });
    return;
  }

  if (!isAdmin && !isCreator) {
    if (data.title !== undefined || data.description !== undefined || data.priority !== undefined || data.dueDate !== undefined) {
      res.status(403).json({
        message: 'Only the creator or admin can edit task details. Assignees may only change status.',
      });
      return;
    }
  }

  const dueDate = parseDueDate(data.dueDate as string | null | undefined);

  const task = await prisma.task.update({
    where: { id: req.task.taskId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
      ...(dueDate !== undefined && { dueDate }),
    },
    include: { comments: { take: 1, orderBy: { createdAt: 'desc' } } },
  });

  res.json({
    task: {
      ...task,
      _count: { comments: task.comments.length },
    },
  });
}

export async function deleteTask(req: Request, res: Response) {
  if (!req.task || !req.user) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const isAdmin = req.task.membership.role === Role.ADMIN;
  const isCreator = req.task.task.createdById === req.user.id;

  if (!isAdmin && !isCreator) {
    res.status(403).json({ message: 'Only the creator or admin can delete this task' });
    return;
  }

  await prisma.task.delete({ where: { id: req.task.taskId } });
  res.json({ message: 'Task deleted' });
}

export async function addComment(req: Request, res: Response) {
  if (!req.task || !req.user) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const { body } = req.body as z.infer<typeof addCommentSchema>;

  const comment = await prisma.comment.create({
    data: {
      taskId: req.task.taskId,
      authorId: req.user.id,
      body,
    },
    include: { author: { select: { id: true, name: true, email: true } } },
  });

  res.status(201).json({ comment });
}

export async function listComments(req: Request, res: Response) {
  if (!req.task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const comments = await prisma.comment.findMany({
    where: { taskId: req.task.taskId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ comments });
}
