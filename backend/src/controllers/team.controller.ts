import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { Role, InviteStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
});

export const createInviteSchema = z
  .object({
    expiresInHours: z.coerce.number().int().positive().optional().default(168),
  })
  .optional();

export const acceptInviteSchema = z
  .object({
    userId: z.string().optional(),
  })
  .optional();

export async function createTeam(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const { name } = req.body as z.infer<typeof createTeamSchema>;

  const team = await prisma.team.create({
    data: {
      name,
      members: {
        create: {
          userId: req.user.id,
          role: Role.ADMIN,
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { projects: true } },
    },
  });

  res.status(201).json({ team });
}

export async function listMyTeams(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const memberships = await prisma.teamMember.findMany({
    where: { userId: req.user.id },
    include: {
      team: {
        include: {
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  const teams = memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    createdAt: m.team.createdAt,
    role: m.role,
    joinedAt: m.joinedAt,
    _count: m.team._count,
  }));

  res.json({ teams });
}

export async function getTeam(req: Request, res: Response) {
  if (!req.team) {
    res.status(404).json({ message: 'Team not found' });
    return;
  }

  const team = await prisma.team.findUnique({
    where: { id: req.team.teamId },
    include: {
      _count: { select: { members: true, projects: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!team) {
    res.status(404).json({ message: 'Team not found' });
    return;
  }

  res.json({
    team: {
      ...team,
      myRole: req.team.membership.role,
    },
  });
}

export async function listMembers(req: Request, res: Response) {
  if (!req.team) {
    res.status(404).json({ message: 'Team not found' });
    return;
  }

  const members = await prisma.teamMember.findMany({
    where: { teamId: req.team.teamId },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  res.json({
    members: members.map((m) => ({
      ...m,
      user: m.user,
      isMe: m.userId === req.user?.id,
    })),
  });
}

export async function removeMember(req: Request, res: Response) {
  if (!req.team) {
    res.status(404).json({ message: 'Team not found' });
    return;
  }

  const { userId } = req.params;

  if (userId === req.user?.id) {
    res.status(400).json({ message: 'Cannot remove yourself. Leave the team instead.' });
    return;
  }

  const target = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: req.team.teamId, userId } },
  });

  if (!target) {
    res.status(404).json({ message: 'Member not found' });
    return;
  }

  if (target.role === Role.ADMIN) {
    const adminCount = await prisma.teamMember.count({
      where: { teamId: req.team.teamId, role: Role.ADMIN },
    });
    if (adminCount <= 1) {
      res.status(400).json({ message: 'Cannot remove the last admin' });
      return;
    }
  }

  await prisma.teamMember.delete({ where: { id: target.id } });
  res.json({ message: 'Member removed' });
}

export async function createInvitation(req: Request, res: Response) {
  if (!req.team) {
    res.status(404).json({ message: 'Team not found' });
    return;
  }

  const body = (req.body ?? {}) as z.infer<typeof createInviteSchema>;
  const expiresInHours = body?.expiresInHours ?? 168;

  const token = `${req.team.teamId.slice(0, 4)}-${crypto
    .randomBytes(8)
    .toString('hex')
    .toUpperCase()}`;

  const invitation = await prisma.invitation.create({
    data: {
      teamId: req.team.teamId,
      token,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    },
  });

  res.status(201).json({ invitation });
}

export async function acceptInvitation(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const { token } = req.params;

  const invitation = await prisma.invitation.findUnique({
    where: { token: token.toUpperCase() },
    include: { team: true },
  });

  if (!invitation) {
    res.status(404).json({ message: 'Invitation not found' });
    return;
  }

  if (invitation.status === InviteStatus.ACCEPTED) {
    res.status(400).json({ message: 'Invitation already accepted' });
    return;
  }

  if (invitation.status === InviteStatus.EXPIRED || invitation.expiresAt < new Date()) {
    if (invitation.status !== InviteStatus.EXPIRED) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InviteStatus.EXPIRED },
      });
    }
    res.status(400).json({ message: 'Invitation expired' });
    return;
  }

  const existing = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: invitation.teamId, userId: req.user.id } },
  });

  if (existing) {
    res.status(409).json({ message: 'Already a member of this team' });
    return;
  }

  const membership = await prisma.$transaction(async (tx) => {
    const m = await tx.teamMember.create({
      data: { teamId: invitation.teamId, userId: req.user!.id, role: Role.MEMBER },
      include: {
        team: { include: { _count: { select: { members: true, projects: true } } } },
      },
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: InviteStatus.ACCEPTED },
    });
    return m;
  });

  res.status(201).json({
    team: {
      id: membership.team.id,
      name: membership.team.name,
      createdAt: membership.team.createdAt,
      role: membership.role,
      joinedAt: membership.joinedAt,
      _count: membership.team._count,
    },
  });
}

export async function getInvitationPreview(req: Request, res: Response) {
  const { token } = req.params;

  const invitation = await prisma.invitation.findUnique({
    where: { token: token.toUpperCase() },
    include: { team: { select: { id: true, name: true, createdAt: true } } },
  });

  if (!invitation) {
    res.status(404).json({ message: 'Invitation not found' });
    return;
  }

  if (invitation.expiresAt < new Date()) {
    res.status(400).json({ message: 'Invitation expired' });
    return;
  }

  res.json({
    team: invitation.team,
    expiresAt: invitation.expiresAt,
  });
}
