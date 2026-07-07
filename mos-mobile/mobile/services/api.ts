const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
let storedUserId: string | null = null;
let storedEmail: string | null = null;
let storedRole: string | null = null;
let authListeners: Array<(event: string, session: any) => void> = [];

function notify(event: string, session: any) {
  for (const fn of authListeners) fn(event, session);
}

export async function authSignUp(email: string, password: string, name: string, role: string = 'client') {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Signup failed'); }
  const data = await res.json();
  storedUserId = data.user_id;
  storedEmail = data.email;
  storedRole = role;
  notify('SIGNED_IN', { user: { id: data.user_id, email: data.email } });
  return data;
}

export async function authSignIn(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Login failed'); }
  const data = await res.json();
  storedUserId = data.user_id;
  storedEmail = data.email;
  storedRole = data.role;
  notify('SIGNED_IN', { user: { id: data.user_id, email: data.email } });
  return data;
}

export function authSignOut() {
  storedUserId = null;
  storedEmail = null;
  storedRole = null;
  notify('SIGNED_OUT', null);
}

export function getSession() {
  if (storedUserId) {
    return { data: { session: { user: { id: storedUserId, email: storedEmail } } } };
  }
  return { data: { session: null } };
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  authListeners.push(callback);
  return { data: { subscription: { unsubscribe: () => { authListeners = authListeners.filter(f => f !== callback); } } } };
}

export async function fetchProfile(userId: string) {
  const res = await fetch(`${API_URL}/api/profile/${userId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateProfile(userId: string, data: Record<string, any>) {
  const res = await fetch(`${API_URL}/api/profile`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...data }),
  });
  if (!res.ok) throw new Error('Profile update failed');
  return res.json();
}

export async function fetchActiveProgram(userId: string) {
  const res = await fetch(`${API_URL}/api/program/${userId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function generateProgram(userId: string) {
  const res = await fetch(`${API_URL}/api/generate-program`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error('Program generation failed');
  return res.json();
}

export async function fetchCheckins(userId: string, limit = 10) {
  const res = await fetch(`${API_URL}/api/checkin/${userId}?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.checkins || [];
}

export async function addCheckin(userId: string, data: Record<string, any>) {
  const res = await fetch(`${API_URL}/api/checkin`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...data }),
  });
  if (!res.ok) throw new Error('Checkin failed');
  return res.json();
}

export async function fetchWorkouts(userId: string, limit = 100) {
  const res = await fetch(`${API_URL}/api/workout/${userId}?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.workouts || [];
}

export async function addWorkout(userId: string, data: Record<string, any>) {
  const res = await fetch(`${API_URL}/api/workout`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...data }),
  });
  if (!res.ok) throw new Error('Workout log failed');
  return res.json();
}

export async function fetchChatHistory(userId: string, limit = 50) {
  const res = await fetch(`${API_URL}/api/chat/history`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, limit }),
  });
  if (!res.ok) return { messages: [] };
  return res.json();
}

export async function sendChat(userId: string, message: string) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, message }),
  });
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}

export async function fetchCoachClients(coachId: string) {
  const res = await fetch(`${API_URL}/api/coach/clients/${coachId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.clients || [];
}

export async function addCoachClient(coachId: string, email: string) {
  const res = await fetch(`${API_URL}/api/coach/add-client`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coach_id: coachId, email }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Add client failed'); }
  return res.json();
}

export { storedUserId as currentUserId, storedRole as currentRole };
