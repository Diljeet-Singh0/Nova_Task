export type Role = 'ADMIN' | 'MEMBER';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  createdAt: string;
  role?: Role;
  joinedAt?: string;
  myRole?: Role;
  _count?: { members: number; projects: number };
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: User;
  isMe?: boolean;
}

export interface Invitation {
  id: string;
  teamId: string;
  token: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdById: string;
  createdAt: string;
  _count?: { tasks: number };
  stats?: { total: number; todo: number; inProgress: number; done: number };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  dueDate: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
  comments?: Comment[];
  project?: { id: string; name: string; teamId: string; team?: { id: string; name: string } };
  assignee?: User | null;
  creator?: User | null;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: User;
}

export interface DashboardStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  high: number;
}

export interface ApiError {
  message: string;
  errors?: { path: string; message: string }[];
}
