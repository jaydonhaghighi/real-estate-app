import Constants from 'expo-constants';

export interface ApiContext {
  userId: string;
  teamId: string;
  role: 'AGENT' | 'TEAM_LEAD';
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const apiBaseUrl = extra.API_BASE_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/v1';

const defaultContext: ApiContext = {
  userId: process.env.EXPO_PUBLIC_USER_ID ?? '00000000-0000-0000-0000-000000000001',
  teamId: process.env.EXPO_PUBLIC_TEAM_ID ?? '00000000-0000-0000-0000-000000000010',
  role: (process.env.EXPO_PUBLIC_ROLE as 'AGENT' | 'TEAM_LEAD') ?? 'AGENT'
};

async function buildHttpError(response: Response): Promise<Error> {
  let details: string | undefined;

  try {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const parsed = (await response.json()) as { message?: unknown };
      if (typeof parsed.message === 'string') {
        details = parsed.message;
      } else if (Array.isArray(parsed.message)) {
        details = parsed.message.filter((item) => typeof item === 'string').join(', ');
      }
    } else {
      const textBody = await response.text();
      if (textBody.trim().length > 0) {
        details = textBody.trim();
      }
    }
  } catch (_error) {
    details = undefined;
  }

  const statusText = response.statusText || 'Request failed';
  if (details) {
    return new Error(`${response.status} ${statusText}: ${details}`);
  }
  return new Error(`${response.status} ${statusText}`);
}

export async function apiGet<T>(path: string, context = defaultContext): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'x-user-id': context.userId,
      'x-team-id': context.teamId,
      'x-role': context.role
    }
  });
  if (!response.ok) {
    throw await buildHttpError(response);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, context = defaultContext): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-user-id': context.userId,
      'x-team-id': context.teamId,
      'x-role': context.role
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw await buildHttpError(response);
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown, context = defaultContext): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-user-id': context.userId,
      'x-team-id': context.teamId,
      'x-role': context.role
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw await buildHttpError(response);
  }

  return response.json() as Promise<T>;
}
