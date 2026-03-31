/**
 * DriveSense Simple API — Lightweight JSON-file-based server
 * No PostgreSQL or Redis required. Stores users + profiles in JSON files,
 * profile pictures as files on disk.
 *
 * Run: node server/dist/simple-api.js
 * Or:  tsx server/src/simple-api.ts
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const UPLOADS_DIR = join(DATA_DIR, 'uploads');
const USERS_FILE = join(DATA_DIR, 'users.json');
const PROFILES_FILE = join(DATA_DIR, 'profiles.json');

// Ensure data directories exist
mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoredUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
}

interface StoredProfile {
  userId: string;
  profilePicture?: string | undefined;
  cars: unknown[];
  selectedCarId?: string;
  fuelPriceBenzin: number;
  fuelPriceDiesel: number;
  fuelPriceElektro: number;
  settings: Record<string, unknown>;
}

// ─── Persistence Helpers ─────────────────────────────────────────────────────

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function loadUsers(): StoredUser[] {
  if (!existsSync(USERS_FILE)) {
    // Seed with default admin
    const admin: StoredUser = {
      id: 'admin-dtheg',
      username: 'DtheG',
      email: 'admin@drivesense.de',
      passwordHash: hashPassword('Admin0815A'),
      role: 'admin',
      createdAt: Date.now(),
    };
    saveUsers([admin]);
    return [admin];
  }
  return JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
}

function saveUsers(users: StoredUser[]): void {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function loadProfiles(): Record<string, StoredProfile> {
  if (!existsSync(PROFILES_FILE)) {
    saveProfiles({});
    return {};
  }
  return JSON.parse(readFileSync(PROFILES_FILE, 'utf-8'));
}

function saveProfiles(profiles: Record<string, StoredProfile>): void {
  writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
}

// ─── Server ──────────────────────────────────────────────────────────────────

async function start() {
  const app = Fastify({
    logger: true,
    bodyLimit: 60 * 1024 * 1024, // 60 MB for profile picture uploads
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(websocket);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ─── Auth Routes ─────────────────────────────────────────────────────────

  // POST /api/v1/auth/login
  app.post<{ Body: { email: string; password: string } }>('/api/v1/auth/login', async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply.status(400).send({ error: 'E-Mail und Passwort erforderlich' });
    }

    const users = loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return reply.status(401).send({ error: 'Benutzer nicht gefunden' });
    }
    if (user.passwordHash !== hashPassword(password)) {
      return reply.status(401).send({ error: 'Falsches Passwort' });
    }

    // Return a simple token (user ID signed with HMAC)
    const token = createToken(user.id);

    return reply.send({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      token,
    });
  });

  // POST /api/v1/auth/me — validate token
  app.get('/api/v1/auth/me', async (request, reply) => {
    const userId = extractUserId(request.headers.authorization);
    if (!userId) return reply.status(401).send({ error: 'Nicht authentifiziert' });

    const users = loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return reply.status(401).send({ error: 'Benutzer nicht gefunden' });

    return reply.send({
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  });

  // ─── User Management (Admin only) ────────────────────────────────────────

  // GET /api/v1/users — list all users
  app.get('/api/v1/users', async (request, reply) => {
    const userId = extractUserId(request.headers.authorization);
    if (!userId) return reply.status(401).send({ error: 'Nicht authentifiziert' });

    const users = loadUsers();
    const caller = users.find((u) => u.id === userId);
    if (!caller || caller.role !== 'admin') {
      return reply.status(403).send({ error: 'Keine Berechtigung' });
    }

    return reply.send({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  });

  // POST /api/v1/users — create user (admin only)
  app.post<{ Body: { username: string; email: string; password: string; role?: string } }>('/api/v1/users', async (request, reply) => {
    const adminId = extractUserId(request.headers.authorization);
    if (!adminId) return reply.status(401).send({ error: 'Nicht authentifiziert' });

    const users = loadUsers();
    const admin = users.find((u) => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
      return reply.status(403).send({ error: 'Keine Berechtigung' });
    }

    const { username, email, password, role } = request.body ?? {};
    if (!username || !email || !password) {
      return reply.status(400).send({ error: 'Username, E-Mail und Passwort erforderlich' });
    }
    if (username.length < 2) return reply.status(400).send({ error: 'Username: mind. 2 Zeichen' });
    if (!email.includes('@')) return reply.status(400).send({ error: 'Ungültige E-Mail' });
    if (password.length < 4) return reply.status(400).send({ error: 'Passwort: mind. 4 Zeichen' });

    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return reply.status(409).send({ error: 'E-Mail bereits registriert' });
    }
    if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return reply.status(409).send({ error: 'Benutzername bereits vergeben' });
    }

    const newUser: StoredUser = {
      id: randomBytes(16).toString('hex'),
      username,
      email,
      passwordHash: hashPassword(password),
      role: role === 'admin' ? 'admin' : 'user',
      createdAt: Date.now(),
    };
    users.push(newUser);
    saveUsers(users);

    return reply.status(201).send({
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role, createdAt: newUser.createdAt },
    });
  });

  // DELETE /api/v1/users/:id — delete user (admin only)
  app.delete<{ Params: { id: string } }>('/api/v1/users/:id', async (request, reply) => {
    const adminId = extractUserId(request.headers.authorization);
    if (!adminId) return reply.status(401).send({ error: 'Nicht authentifiziert' });

    const users = loadUsers();
    const admin = users.find((u) => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
      return reply.status(403).send({ error: 'Keine Berechtigung' });
    }

    const targetId = request.params.id;
    if (targetId === adminId) {
      return reply.status(400).send({ error: 'Kann sich nicht selbst löschen' });
    }

    const filtered = users.filter((u) => u.id !== targetId);
    if (filtered.length === users.length) {
      return reply.status(404).send({ error: 'Benutzer nicht gefunden' });
    }
    saveUsers(filtered);

    // Also remove profile and picture
    const profiles = loadProfiles();
    const profile = profiles[targetId];
    if (profile?.profilePicture) {
      const picPath = join(UPLOADS_DIR, profile.profilePicture);
      try { unlinkSync(picPath); } catch { /* ignore */ }
    }
    delete profiles[targetId];
    saveProfiles(profiles);

    return reply.send({ message: 'Benutzer gelöscht' });
  });

  // ─── Profile Routes ──────────────────────────────────────────────────────

  // GET /api/v1/profile — get own profile
  app.get('/api/v1/profile', async (request, reply) => {
    const userId = extractUserId(request.headers.authorization);
    if (!userId) return reply.status(401).send({ error: 'Nicht authentifiziert' });

    const profiles = loadProfiles();
    const profile = profiles[userId] ?? null;

    // If profile has a picture filename, build the URL
    let profilePicture: string | undefined;
    if (profile?.profilePicture) {
      const host = request.headers.host ?? 'localhost:3000';
      const protocol = request.headers['x-forwarded-proto'] ?? 'http';
      profilePicture = `${protocol}://${host}/api/v1/uploads/${profile.profilePicture}`;
    }

    return reply.send({ profile: profile ? { ...profile, profilePicture } : null });
  });

  // PUT /api/v1/profile — update profile (without picture)
  app.put<{ Body: Partial<StoredProfile> }>('/api/v1/profile', async (request, reply) => {
    const userId = extractUserId(request.headers.authorization);
    if (!userId) return reply.status(401).send({ error: 'Nicht authentifiziert' });

    const profiles = loadProfiles();
    const existing = profiles[userId] ?? {
      userId,
      cars: [],
      fuelPriceBenzin: 1.75,
      fuelPriceDiesel: 1.62,
      fuelPriceElektro: 0.35,
      settings: {},
    };

    const body = request.body ?? {};
    // Don't allow overwriting userId or profilePicture via this route
    const updated: StoredProfile = {
      ...existing,
      ...body,
      userId,
      profilePicture: existing.profilePicture,
    };
    profiles[userId] = updated;
    saveProfiles(profiles);

    return reply.send({ profile: updated });
  });

  // POST /api/v1/profile/picture — upload profile picture
  app.post('/api/v1/profile/picture', async (request, reply) => {
    const userId = extractUserId(request.headers.authorization);
    if (!userId) return reply.status(401).send({ error: 'Nicht authentifiziert' });

    const contentType = request.headers['content-type'] ?? '';

    // Accept raw binary with content-type image/*
    if (!contentType.startsWith('image/')) {
      return reply.status(400).send({ error: 'Content-Type muss image/* sein' });
    }

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const filename = `${userId}.${ext}`;
    const filepath = join(UPLOADS_DIR, filename);

    // Get raw body as Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of request.raw) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const data = Buffer.concat(chunks);

    if (data.length > 50 * 1024 * 1024) {
      return reply.status(413).send({ error: 'Bild darf max. 50 MB groß sein' });
    }
    if (data.length === 0) {
      return reply.status(400).send({ error: 'Leere Datei' });
    }

    writeFileSync(filepath, data);

    // Update profile
    const profiles = loadProfiles();
    if (!profiles[userId]) {
      profiles[userId] = {
        userId,
        profilePicture: filename,
        cars: [],
        fuelPriceBenzin: 1.75,
        fuelPriceDiesel: 1.62,
        fuelPriceElektro: 0.35,
        settings: {},
      };
    } else {
      // Delete old picture if different filename
      const old = profiles[userId].profilePicture;
      if (old && old !== filename) {
        try { unlinkSync(join(UPLOADS_DIR, old)); } catch { /* ignore */ }
      }
      profiles[userId].profilePicture = filename;
    }
    saveProfiles(profiles);

    const host = request.headers.host ?? 'localhost:3000';
    const protocol = request.headers['x-forwarded-proto'] ?? 'http';
    const url = `${protocol}://${host}/api/v1/uploads/${filename}`;

    return reply.send({ url });
  });

  // DELETE /api/v1/profile/picture — remove profile picture
  app.delete('/api/v1/profile/picture', async (request, reply) => {
    const userId = extractUserId(request.headers.authorization);
    if (!userId) return reply.status(401).send({ error: 'Nicht authentifiziert' });

    const profiles = loadProfiles();
    if (profiles[userId]?.profilePicture) {
      const filepath = join(UPLOADS_DIR, profiles[userId].profilePicture!);
      try { unlinkSync(filepath); } catch { /* ignore */ }
      delete profiles[userId].profilePicture;
      saveProfiles(profiles);
    }

    return reply.send({ message: 'Profilbild gelöscht' });
  });

  // GET /api/v1/uploads/:filename — serve profile pictures (public)
  app.get<{ Params: { filename: string } }>('/api/v1/uploads/:filename', async (request, reply) => {
    const { filename } = request.params;
    // Sanitize filename — only allow alphanumeric, dots, hyphens
    if (!/^[\w.-]+$/.test(filename)) {
      return reply.status(400).send({ error: 'Ungültiger Dateiname' });
    }

    const filepath = join(UPLOADS_DIR, filename);
    if (!existsSync(filepath)) {
      return reply.status(404).send({ error: 'Datei nicht gefunden' });
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };

    const data = readFileSync(filepath);
    return reply
      .header('Content-Type', mimeTypes[ext ?? ''] ?? 'application/octet-stream')
      .header('Cache-Control', 'public, max-age=86400')
      .send(data);
  });

  // ─── WebSocket: Live User Tracking ─────────────────────────────────────

  interface WsClient {
    ws: unknown;
    userId: string;
    username: string;
    profilePicture?: string | undefined;
    position?: [number, number];
    heading?: number;
    speed?: number;
    status?: string;
    route?: [number, number][] | undefined;
    destination?: string | undefined;
    lastUpdate: number;
  }

  const wsClients = new Map<string, WsClient>();

  function broadcastUsers() {
    const now = Date.now();
    const userList = Array.from(wsClients.values())
      .filter((c) => now - c.lastUpdate < 60_000) // only active in last 60s
      .map((c) => ({
        id: c.userId,
        username: c.username,
        profilePicture: c.profilePicture,
        position: c.position,
        heading: c.heading ?? 0,
        speed: c.speed ?? 0,
        status: c.status ?? 'idle',
        route: c.route,
        destination: c.destination,
        lastUpdate: c.lastUpdate,
      }));
    const msg = JSON.stringify({ type: 'users', users: userList });
    for (const client of wsClients.values()) {
      const ws = client.ws as { readyState: number; send: (data: string) => void };
      if (ws.readyState === 1) {
        ws.send(msg);
      }
    }
  }

  // Periodic broadcast every 3 seconds
  const broadcastInterval = setInterval(broadcastUsers, 3000);
  app.addHook('onClose', () => clearInterval(broadcastInterval));

  app.get('/api/v1/ws', { websocket: true }, (socket, request) => {
    // Auth via query param: ?token=...
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const userId = extractUserId(token ? `Bearer ${token}` : undefined);

    if (!userId) {
      socket.send(JSON.stringify({ type: 'error', message: 'Nicht authentifiziert' }));
      socket.close();
      return;
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      socket.send(JSON.stringify({ type: 'error', message: 'Benutzer nicht gefunden' }));
      socket.close();
      return;
    }

    // Build profile picture URL
    const profiles = loadProfiles();
    const profile = profiles[userId];
    let profilePicture: string | undefined;
    if (profile?.profilePicture) {
      const host = request.headers.host ?? 'localhost:788';
      const protocol = request.headers['x-forwarded-proto'] ?? 'http';
      profilePicture = `${protocol}://${host}/api/v1/uploads/${profile.profilePicture}`;
    }

    const client: WsClient = {
      ws: socket,
      userId,
      username: user.username,
      profilePicture,
      lastUpdate: Date.now(),
    };
    wsClients.set(userId, client);

    // Send current users immediately
    broadcastUsers();

    socket.on('message', (raw: unknown) => {
      try {
        const data = JSON.parse(String(raw));
        if (data.type === 'position') {
          const c = wsClients.get(userId);
          if (c) {
            if (Array.isArray(data.position) && data.position.length === 2) c.position = data.position;
            if (typeof data.heading === 'number') c.heading = data.heading;
            if (typeof data.speed === 'number') c.speed = data.speed;
            if (typeof data.status === 'string') c.status = data.status;
            if (Array.isArray(data.route)) c.route = data.route;
            else if (data.route === null) c.route = undefined;
            if (typeof data.destination === 'string') c.destination = data.destination;
            else if (data.destination === null) c.destination = undefined;
            c.lastUpdate = Date.now();
          }
          // Broadcast immediately on position update
          broadcastUsers();
        }
      } catch { /* ignore malformed messages */ }
    });

    socket.on('close', () => {
      wsClients.delete(userId);
      broadcastUsers();
    });
  });

  // ─── Token Helpers ───────────────────────────────────────────────────────

  const TOKEN_SECRET = process.env.TOKEN_SECRET ?? 'drivesense-dev-secret-change-in-prod';

  function createToken(userId: string): string {
    const payload = `${userId}:${Date.now() + 30 * 24 * 60 * 60 * 1000}`;
    const sig = createHash('sha256').update(payload + TOKEN_SECRET).digest('hex').slice(0, 16);
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  }

  function extractUserId(authHeader: string | undefined): string | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
      const decoded = Buffer.from(authHeader.slice(7), 'base64url').toString();
      const [userId, expiresStr, sig] = decoded.split(':');
      if (!userId || !expiresStr || !sig) return null;

      const expires = parseInt(expiresStr, 10);
      if (Date.now() > expires) return null;

      const expectedSig = createHash('sha256').update(`${userId}:${expiresStr}` + TOKEN_SECRET).digest('hex').slice(0, 16);
      if (sig !== expectedSig) return null;

      return userId;
    } catch {
      return null;
    }
  }

  // ─── Start ───────────────────────────────────────────────────────────────

  const PORT = parseInt(process.env.PORT ?? '788', 10);
  const HOST = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port: PORT, host: HOST });
  console.log(`\n🚀 DriveSense API running at http://${HOST}:${PORT}\n`);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
