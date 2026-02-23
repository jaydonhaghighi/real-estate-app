import { Request } from 'express';

export interface UserContext {
  userId: string;
  teamId: string;
  role: 'AGENT' | 'TEAM_LEAD';
}

export interface RequestWithUser extends Request {
  user?: UserContext;
}
