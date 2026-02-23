export type Role = 'AGENT' | 'TEAM_LEAD';
export type LeadState = 'New' | 'Active' | 'At-Risk' | 'Stale';
export type Direction = 'inbound' | 'outbound' | 'internal';
export type TaskStatus = 'open' | 'done' | 'snoozed' | 'cancelled';
export type TaskType = 'contact_now' | 'follow_up' | 'rescue' | 'call_outcome' | 'manual';

export const LEAD_STATES: LeadState[] = ['New', 'Active', 'At-Risk', 'Stale'];
export const TASK_STATUSES: TaskStatus[] = ['open', 'done', 'snoozed', 'cancelled'];
export const TASK_TYPES: TaskType[] = ['contact_now', 'follow_up', 'rescue', 'call_outcome', 'manual'];
