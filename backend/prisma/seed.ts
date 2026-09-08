import { PrismaClient, Role, TaskStatus, Priority, ProjectStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demopassword', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      name: 'Demo Admin',
      email: 'admin@demo.com',
      passwordHash,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@demo.com' },
    update: {},
    create: {
      name: 'Demo Member',
      email: 'member@demo.com',
      passwordHash,
    },
  });

  const team = await prisma.team.upsert({
    where: { id: 'demo-team-id' },
    update: {},
    create: {
      id: 'demo-team-id',
      name: 'Acme Product Team',
      members: {
        create: [
          { userId: admin.id, role: Role.ADMIN },
          { userId: member.id, role: Role.MEMBER },
        ],
      },
    },
  });

  const project = await prisma.project.upsert({
    where: { id: 'demo-project-id' },
    update: {},
    create: {
      id: 'demo-project-id',
      teamId: team.id,
      name: 'Website Redesign',
      description:
        'A full redesign of the marketing site and customer dashboard. Includes research, design, implementation, and launch.',
      status: ProjectStatus.ACTIVE,
      createdById: admin.id,
    },
  });

  const tasks = [
    {
      id: 'demo-task-1',
      title: 'Research competitors and document findings',
      description: 'Review top 5 competitor sites. Note strengths, weaknesses, and patterns.',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      assigneeId: admin.id,
      createdById: admin.id,
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
    {
      id: 'demo-task-2',
      title: 'Create low-fi wireframes (landing + pricing)',
      status: TaskStatus.DONE,
      priority: Priority.HIGH,
      assigneeId: admin.id,
      createdById: admin.id,
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      id: 'demo-task-3',
      title: 'Design system audit & tokens',
      description:
        'Audit existing components, define color + spacing tokens, set up Tailwind theme.',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      assigneeId: member.id,
      createdById: admin.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
    },
    {
      id: 'demo-task-4',
      title: 'Build new hero section (responsive)',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      assigneeId: member.id,
      createdById: admin.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    },
    {
      id: 'demo-task-5',
      title: 'Draft new pricing copy',
      description: 'Landing, pricing, and features pages.',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      assigneeId: null,
      createdById: admin.id,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6),
    },
    {
      id: 'demo-task-6',
      title: 'QA on mobile browsers',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      assigneeId: null,
      createdById: member.id,
    },
  ];

  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        ...t,
        projectId: project.id,
      },
    });
  }

  await prisma.comment.upsert({
    where: { id: 'demo-comment-1' },
    update: {},
    create: {
      id: 'demo-comment-1',
      taskId: 'demo-task-3',
      authorId: admin.id,
      body: 'Make sure we keep the indigo/violet accent — brand color — the team likes that direction.',
    },
  });

  console.log('✅ Seed complete.');
  console.log('');
  console.log('🔑 Demo Admin:    admin@demo.com  /  demopassword');
  console.log('🔑 Demo Member:  member@demo.com  /  demopassword');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
