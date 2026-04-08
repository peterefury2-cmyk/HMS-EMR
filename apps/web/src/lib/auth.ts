interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  exp: number;
  iat: number;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('hms_token');
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('hms_token', token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('hms_token');
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export function getUser(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;
  return decodeJwt(token);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJwt(token);
  if (!payload) return false;
  return payload.exp * 1000 > Date.now();
}

export async function login(email: string, password: string): Promise<{ access_token: string; user: JwtPayload }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }
  const data = await response.json();
  setToken(data.access_token);
  return data;
}

export function logout(): void {
  removeToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
