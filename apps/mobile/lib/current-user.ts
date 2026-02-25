import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';

import { apiGet } from './api';

export type CurrentUser = {
  userId: string;
  teamId: string;
  role: 'AGENT' | 'TEAM_LEAD';
};

type Role = CurrentUser['role'];

function parseRole(value: string | undefined): Role | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'AGENT' || normalized === 'TEAM_LEAD') {
    return normalized;
  }

  return null;
}

function getConfiguredDevRole(): Role | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
  return parseRole(extra.DEV_ROLE) ?? parseRole(process.env.EXPO_PUBLIC_DEV_ROLE);
}

export function useCurrentUser() {
  const query = useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiGet<CurrentUser>('/users/me'),
    staleTime: 60_000,
    retry: 1
  });

  const effectiveRole = query.data?.role ?? getConfiguredDevRole();

  return {
    ...query,
    effectiveRole
  };
}
