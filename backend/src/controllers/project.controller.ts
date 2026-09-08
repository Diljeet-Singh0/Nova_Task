import { Request, Response } from 'express';
import { z } from 'zod';
import { ProjectStatus, TaskStatus, Priority } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export async function listProjects(req: Request, res: Response) {
  if (!req.team) {
    res.status(404).json({ message: 'Team not found' });
    return;
  }

  const includeArchived = req.query.includeArchived === 'true';

  const projects = await prisma.project.findMany({
    where: {
      teamId: req.team.teamId,
      ...(includeArchived ? {} : { status: ProjectStatus.ACTIVE }),
    },
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
      tasks: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const projectsWithStats = projects.map((p) => {
    const total = p.tasks.length;
    const inProgress = p.tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
    const done = p.tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const todo = p.tasks.filter((t) => t.status === TaskStatus.TODO).length;
    return {
      id: p.id,
      teamId: p.teamId,
      name: p.name,
      description: p.description,
      status: p.status,
      createdById: p.createdById,
      createdAt: p.createdAt,
      _count: { tasks: total },
      stats: { total, todo, inProgress, done },
    };
  });

  res.json({ projects: projectsWithStats });
}

export async function createProject(req: Request, res: Response) {
  if (!req.team || !req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const { name, description } = req.body as z.infer<typeof createProjectSchema>;

  const project = await prisma.project.create({
    data: {
      teamId: req.team.teamId,
      name,
      description: description ?? null,
      createdById: req.user.id,
    },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  res.status(201).json({
    project: {
      ...project,
      stats: { total: 0, todo: 0, inProgress: 0, done: 0 },
    },
  });
}

export async function updateProject(req: Request, res: Response) {
  if (!req.project) {
    res.status(404).json({ message: 'Project not found' });
    return;
  }

  const data = req.body as z.infer<typeof updateProjectSchema>;

  const project = await prisma.project.update({
    where: { id: req.project.projectId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
    },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
  });

  const total = project.tasks.length;
  const inProgress = project.tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  const done = project.tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const todo = project.tasks.filter((t) => t.status === TaskStatus.TODO).length;

  res.json({
    project: {
      id: project.id,
      teamId: project.teamId,
      name: project.name,
      description: project.description,
      status: project.status,
      createdById: project.createdById,
      createdAt: project.createdAt,
      _count: { tasks: total },
      stats: { total, todo, inProgress, done },
    },
  });
}

export async function getMyTasks(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const tasks = await prisma.task.findMany({
    where: {
      OR: [{ assigneeId: req.user.id }, { createdById: req.user.id }],
      project: { status: ProjectStatus.ACTIVE },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          teamId: true,
          team: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  const done = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const todo = tasks.filter((t) => t.status === TaskStatus.TODO).length;
  const high = tasks.filter((t) => t.priority === Priority.HIGH && t.status !== TaskStatus.DONE).length;

  res.json({
    tasks,
    stats: { total, todo, inProgress, done, high },
  });
}
