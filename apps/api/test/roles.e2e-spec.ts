import { describe, expect, it } from 'vitest';

const API = process.env.API_URL ?? 'http://localhost:3001/api/v1';

const ACCOUNTS = {
  admin: { identifier: 'admin@aiqltd.co.tz', password: 'Admin@HireFlow1' },
  staff: { identifier: 'staff@aiqltd.co.tz', password: 'Staff@HireFlow1' },
} as const;

type Session = { token: string; roles: string[] };

async function login(kind: keyof typeof ACCOUNTS): Promise<Session> {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ACCOUNTS[kind]),
  });
  const body = (await response.json()) as {
    data?: { accessToken: string; user: { roles: string[] } };
  };
  expect([200, 201], `${kind} login`).toContain(response.status);
  return {
    token: body.data!.accessToken,
    roles: body.data!.user.roles,
  };
}

async function call(token: string | null, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { ...init, headers });
  return response;
}

describe('HireFlow access for admin and staff', () => {
  const sharedReads = [
    '/auth/me',
    '/dashboard/overview',
    '/customers?limit=5',
    '/equipment/assets?limit=5',
    '/equipment/models?limit=5',
    '/rentals?limit=5',
    '/invoices?limit=5',
    '/payments?limit=5',
    '/dispatches?limit=5',
    '/returns?limit=5',
    '/maintenance?limit=5',
    '/settings/company',
    '/reports/rentals',
  ];

  it.each(['admin', 'staff'] as const)('%s can read operations', async (kind) => {
    const session = await login(kind);
    expect(session.roles).toContain(kind === 'admin' ? 'ADMIN' : 'STAFF');
    for (const path of sharedReads) {
      const response = await call(session.token, path);
      expect(response.status, `${kind} GET ${path}`).toBe(200);
    }
  });

  it('staff is blocked from admin controls', async () => {
    const staff = await login('staff');
    const blocked = await Promise.all([
      call(staff.token, '/users'),
      call(staff.token, '/audit-logs'),
      call(staff.token, '/settings/company', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: 'Should fail' }),
      }),
      call(staff.token, '/equipment/assets', {
        method: 'POST',
        body: JSON.stringify({ assetCode: 'NO-STAFF', modelId: '00000000-0000-0000-0000-000000000000' }),
      }),
      call(staff.token, '/files/from-url', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/machine.jpg' }),
      }),
    ]);
    for (const response of blocked) expect(response.status).toBe(403);
  });

  it('admin can list staff and attach an image by URL or file', async () => {
    const admin = await login('admin');
    const users = await call(admin.token, '/users?limit=5');
    expect(users.status).toBe(200);

    const assetsResponse = await call(admin.token, '/equipment/assets?limit=1');
    const assets = (await assetsResponse.json()) as { data: Array<{ id: string }> };
    const assetId = assets.data[0]?.id;
    expect(assetId).toBeTruthy();

    const byUrl = await call(admin.token, '/files/from-url', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=60',
        assetId,
      }),
    });
    expect(byUrl.status).toBe(201);

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'dot.png');
    form.append('assetId', assetId!);
    const uploaded = await call(admin.token, '/files/upload', { method: 'POST', body: form });
    expect(uploaded.status).toBe(201);
    const uploadedBody = (await uploaded.json()) as { data: { publicUrl: string } };
    expect(uploadedBody.data.publicUrl.startsWith('/uploads/')).toBe(true);

    const fileResponse = await fetch(`http://localhost:3001${uploadedBody.data.publicUrl}`);
    expect(fileResponse.status).toBe(200);
    expect(fileResponse.headers.get('content-type')).toContain('image/png');

    const staff = await login('staff');
    const detail = await call(staff.token, `/equipment/assets/${assetId}`);
    expect(detail.status).toBe(200);
    const asset = (await detail.json()) as { data: { images: Array<{ fileKey: string }> } };
    expect(asset.data.images.length).toBeGreaterThan(0);
  });
});
