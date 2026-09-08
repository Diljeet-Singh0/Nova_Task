import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface TeamContext {
  teamId: string;
  membership: {
    id: string;
    userId: string;
    teamId: string;
    role: Role;
    joinedAt: Date;
  };
}

export interface ProjectContext {
  projectId: string;
  teamId: string;
  membership: TeamContext['membership'];
}

export interface TaskContext {
  taskId: string;
  projectId: string;
  teamId: string;
  membership: TeamContext['membership'];
  task: {
    id: string;
    projectId: string;
    createdById: string;
    assigneeId: string | null;
  };
}

declare global {
  /* eslint-disable @typescript-eslint/no-namespace */
  namespace Express {
    interface Request {
      team?: TeamContext;
      project?: ProjectContext;
      task?: TaskContext;
    }
  }
}

export async function requireTeamMembership(req: Request, res: Response, next: NextFunction) {
  const { teamId } = req.params;
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: req.user.id } },
  });

  if (!membership) {
    res.status(403).json({ message: 'Not a member of this team' });
    return;
  }

  req.team = { teamId, membership };
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.team) {
    res.status(401).json({ message: 'Team context required' });
    return;
  }
  if (req.team.membership.role !== Role.ADMIN) {
    res.status(403).json({ message: 'Admin role required' });
    return;
  }
  next();
}

export async function requireProjectAccess(req: Request, res: Response, next: NextFunction) {
  const { projectId } = req.params;
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, teamId: true },
  });

  if (!project) {
    res.status(404).json({ message: 'Project not found' });
    return;
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: project.teamId, userId: req.user.id } },
  });

  if (!membership) {
    res.status(403).json({ message: 'Not a member of this project\'s team' });
    return;
  }

  req.project = { projectId, teamId: project.teamId, membership };
  next();
}

export async function requireTaskAccess(req: Request, res: Response, next: NextFunction) {
  const { taskId } = req.params;
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      createdById: true,
      assigneeId: true,
      project: { select: { teamId: true } },
    },
  });

  if (!task) {
    res.status(404).json({ message: 'Task not found' });
    return;
  }

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: task.project.teamId, userId: req.user.id } },
  });

  if (!membership) {
    res.status(403).json({ message: 'Not a member of this task\'s team' });
    return;
  }

  req.task = {
    taskId,
    projectId: task.projectId,
    teamId: task.project.teamId,
    membership,
    task: {
      id: task.id,
      projectId: task.projectId,
      createdById: task.createdById,
      assigneeId: task.assigneeId,
    },
  };
  next();
}

export function canModifyTask(req: Request, res: Response, next: NextFunction) {
  if (!req.task || !req.user) {
    res.status(401).json({ message: 'Task context required' });
    return;
  }

  const isAdmin = req.task.membership.role === Role.ADMIN;
  const isCreator = req.task.task.createdById === req.user.id;
  const isAssignee = req.task.task.assigneeId === req.user.id;

  if (!isAdmin && !isCreator && !isAssignee) {
    res.status(403).json({ message: 'You can only modify tasks you created or are assigned to' });
    return;
  }
  next();
}
