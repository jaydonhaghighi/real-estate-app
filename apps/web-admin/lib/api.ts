const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/v1';

const defaultHeaders = {
  'content-type': 'application/json',
  'x-user-id': process.env.WEB_USER_ID ?? '00000000-0000-0000-0000-000000000002',
  'x-team-id': process.env.WEB_TEAM_ID ?? '00000000-0000-0000-0000-000000000010',
  'x-role': process.env.WEB_ROLE ?? 'TEAM_LEAD'
};

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: defaultHeaders
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: defaultHeaders,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}
