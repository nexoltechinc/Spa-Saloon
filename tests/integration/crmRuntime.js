import { execFile, spawn } from 'node:child_process';
import http from 'node:http';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import EmbeddedPostgres from 'embedded-postgres';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dbUser = 'spa_saloon';
const dbPassword = 'spa_saloon';
const dbHost = '127.0.0.1';
const dockerDbPort = 5432;
const adminEmail = 'admin@spa.local';
const adminPassword = 'ChangeMe123!';

const runCommand = (command, args, { cwd = repoRoot, env = {}, timeout = 120000 } = {}) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd,
        env: { ...process.env, ...env },
        maxBuffer: 10 * 1024 * 1024,
        timeout,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
          return;
        }

        resolve({ stdout, stderr });
      },
    );
  });

const createStorage = () => {
  const entries = new Map();

  return {
    getItem: (key) => (entries.has(String(key)) ? entries.get(String(key)) : null),
    setItem: (key, value) => {
      entries.set(String(key), String(value));
    },
    removeItem: (key) => {
      entries.delete(String(key));
    },
    clear: () => {
      entries.clear();
    },
    entries,
  };
};

const findFreePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });

const waitForPredicate = async (predicate, { attempts = 60, intervalMs = 1000, label = 'condition' } = {}) => {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await predicate();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  const error = new Error(`Timed out waiting for ${label}.`);
  if (lastError) {
    error.cause = lastError;
  }
  throw error;
};

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;

const createPgClient = (connectionString) => new Client({ connectionString });

const MOCK_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const createMockSessionToken = ({ email, role = 'admin' }) => {
  const payload = {
    sub: email,
    email,
    role,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + MOCK_SESSION_TTL_MS).toISOString(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.mock-signature`;
};

const readJsonBody = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
};

const runSql = async (connectionString, sql, values = []) => {
  const client = createPgClient(connectionString);
  await client.connect();

  try {
    return await client.query(sql, values);
  } finally {
    await client.end().catch(() => {});
  }
};

const waitForDatabaseReady = async (connectionString) => {
  await waitForPredicate(
    async () => {
      const client = createPgClient(connectionString);
      try {
        await client.connect();
        await client.query('SELECT 1');
        return true;
      } catch {
        return false;
      } finally {
        await client.end().catch(() => {});
      }
    },
    { attempts: 45, intervalMs: 1000, label: 'Postgres readiness' },
  );
};

const waitForApiHealth = async (baseUrl, apiState, { allowDegraded = false } = {}) => {
  await waitForPredicate(
    async () => {
      if (apiState.exitInfo) {
        const error = new Error(`CRM API exited before becoming healthy (code ${apiState.exitInfo.code ?? 'unknown'}).`);
        error.stdout = apiState.logs.join('');
        throw error;
      }

      const response = await fetch(new URL('/api/crm/health', baseUrl), {
        headers: { Accept: 'application/json' },
      });

      return allowDegraded ? response.ok || response.status === 503 : response.ok;
    },
    { attempts: 60, intervalMs: 500, label: 'CRM API health' },
  );
};

const installBrowserShim = (origin, storage = null) => {
  const localStorage = storage?.localStorage || createStorage();
  const sessionStorage = storage?.sessionStorage || createStorage();

  globalThis.window = {
    location: { origin },
    localStorage,
    sessionStorage,
  };
  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;

  return {
    localStorage,
    sessionStorage,
  };
};

export class CrmRuntimeHarness {
  constructor({ root = repoRoot } = {}) {
    this.root = root;
    this.databaseName = `spa_saloon_smoke_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    this.databaseDir = '';
    this.databasePort = dockerDbPort;
    this.databaseMode = null;
    this.verificationMode = 'full';
    this.port = null;
    this.baseUrl = null;
    this.apiProcess = null;
    this.apiState = { logs: [], exitInfo: null };
    this.mockServer = null;
    this.client = null;
    this.browserStorage = null;
    this.startedDb = false;
    this.embedded = null;
    this.dockerStartupError = null;
    this.databaseStartupError = null;
  }

  getMaintenanceConnectionString(databaseName = 'postgres') {
    return `postgres://${dbUser}:${dbPassword}@${dbHost}:${this.databasePort}/${databaseName}`;
  }

  getDatabaseUrl(databaseName = this.databaseName) {
    return `postgres://${dbUser}:${dbPassword}@${dbHost}:${this.databasePort}/${databaseName}`;
  }

  async prepare() {
    try {
      await this.startDatabase();
      this.startedDb = true;
      await this.createDatabase(this.databaseName);

      this.port = await findFreePort();
      this.baseUrl = `http://127.0.0.1:${this.port}`;
      this.browserStorage = installBrowserShim(this.baseUrl);

      await this.startApi({
        port: this.port,
        databaseUrl: this.getDatabaseUrl(),
      });
      await waitForApiHealth(this.baseUrl, this.apiState);
      this.verificationMode = 'full';
      await this.loadFrontendClient();
      return this;
    } catch (error) {
      this.databaseStartupError = error instanceof Error ? error : new Error(String(error || 'CRM database startup failed.'));
    }

    this.verificationMode = 'auth-only';
    this.databaseMode = 'unavailable';
    this.port = await findFreePort();
    this.baseUrl = `http://127.0.0.1:${this.port}`;
    this.browserStorage = installBrowserShim(this.baseUrl);
    this.databasePort = await findFreePort();

    await this.startApi({
      port: this.port,
      databaseUrl: this.getDatabaseUrl(),
    });
    await waitForApiHealth(this.baseUrl, this.apiState, { allowDegraded: true });
    await this.loadFrontendClient();

    return this;
  }

  async startDockerDatabase() {
    await runCommand('docker', ['compose', 'up', '-d', 'db'], { cwd: this.root, timeout: 120000 });
    this.databasePort = dockerDbPort;
    await waitForDatabaseReady(this.getMaintenanceConnectionString());
    this.databaseMode = 'docker';
  }

  async startEmbeddedDatabase() {
    this.databasePort = await findFreePort();
    this.databaseDir = await mkdtemp(path.join(os.tmpdir(), 'spa-saloon-embedded-'));
    this.embedded = new EmbeddedPostgres({
      databaseDir: this.databaseDir,
      user: dbUser,
      password: dbPassword,
      port: this.databasePort,
      persistent: true,
    });

    await this.embedded.initialise();
    await this.embedded.start();
    await waitForDatabaseReady(this.getMaintenanceConnectionString());
    this.databaseMode = 'embedded';
  }

  async startDatabase() {
    try {
      await this.startDockerDatabase();
      return;
    } catch (error) {
      this.dockerStartupError = error;
    }

    await this.stopDockerDatabase().catch(() => {});
    await this.startEmbeddedDatabase();
  }

  async stopDockerDatabase() {
    try {
      await runCommand('docker', ['compose', 'down', '--remove-orphans'], {
        cwd: this.root,
        timeout: 120000,
      });
    } catch {
      // Best-effort cleanup only.
    }
  }

  async stopDatabase() {
    if (this.databaseMode === 'docker') {
      await this.stopDockerDatabase();
      return;
    }

    if (this.databaseMode === 'embedded' && this.embedded) {
      await this.embedded.stop().catch(() => {});
    }
  }

  async loadFrontendClient() {
    if (this.client) {
      return this.client;
    }

    const [crmSession, crmApi, receiptSettings] = await Promise.all([
      import('../../src/config/crm.js'),
      import('../../src/config/crmApi.js'),
      import('../../src/config/receiptSettings.js'),
    ]);

    this.client = {
      ...crmSession,
      ...crmApi,
      ...receiptSettings,
    };

    return this.client;
  }

  async startApi({ port = this.port, databaseUrl = this.getDatabaseUrl() } = {}) {
    if (this.apiProcess) {
      throw new Error('API is already running.');
    }

    const env = {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      CRM_ADMIN_EMAIL: adminEmail,
      CRM_ADMIN_PASSWORD: adminPassword,
      CRM_AUTH_SECRET: 'spa-saloon-smoke-secret',
      CRM_REQUIRE_AUTH: 'true',
    };

    this.apiState = { logs: [], exitInfo: null };
    this.apiProcess = spawn('node', ['server/index.js'], {
      cwd: this.root,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.apiProcess.stdout.on('data', (chunk) => {
      this.apiState.logs.push(chunk.toString());
    });
    this.apiProcess.stderr.on('data', (chunk) => {
      this.apiState.logs.push(chunk.toString());
    });
    this.apiProcess.once('exit', (code, signal) => {
      this.apiState.exitInfo = { code, signal };
      this.apiProcess = null;
    });
  }

  async stopApi() {
    if (!this.apiProcess) {
      return;
    }

    const child = this.apiProcess;
    const exitPromise = new Promise((resolve) => child.once('exit', resolve));

    child.kill('SIGTERM');

    const timeout = new Promise((resolve) => setTimeout(() => resolve(false), 10000));
    const exited = await Promise.race([exitPromise.then(() => true), timeout]);
    if (!exited) {
      child.kill('SIGKILL');
      await exitPromise;
    }
  }

  async startMockAuthServer() {
    if (this.mockServer) {
      throw new Error('Mock auth server is already running.');
    }

    await this.stopApi();

    const server = http.createServer(async (request, response) => {
      const requestUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

      const sendJson = (statusCode, payload) => {
        response.writeHead(statusCode, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        });
        response.end(JSON.stringify(payload));
      };

      if (request.method === 'GET' && requestUrl.pathname === '/api/crm/health') {
        sendJson(200, {
          ok: true,
          ready: true,
          database: {
            state: 'mock',
            message: 'Auth-only verification mode',
          },
          resources: ['auth'],
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (request.method === 'POST' && requestUrl.pathname === '/api/crm/auth/login') {
        const body = await readJsonBody(request);
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');

        if (email !== adminEmail || password !== adminPassword) {
          sendJson(401, {
            code: 'CRM_INVALID_CREDENTIALS',
            message: 'Invalid CRM credentials.',
          });
          return;
        }

        sendJson(200, {
          token: createMockSessionToken({ email: adminEmail, role: 'admin' }),
          user: {
            email: adminEmail,
            role: 'admin',
          },
        });
        return;
      }

      sendJson(404, {
        message: 'Route not found.',
      });
    });

    await new Promise((resolve) => {
      server.listen(this.port, '127.0.0.1', resolve);
    });

    this.mockServer = server;
  }

  async stopMockAuthServer() {
    if (!this.mockServer) {
      return;
    }

    const server = this.mockServer;
    this.mockServer = null;

    await new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  async restartDatabaseAndApi() {
    await this.stopApi();

    if (this.databaseMode === 'docker') {
      await runCommand('docker', ['compose', 'restart', 'db'], { cwd: this.root, timeout: 120000 });
      await waitForDatabaseReady(this.getMaintenanceConnectionString());
    } else if (this.databaseMode === 'embedded' && this.embedded) {
      await this.embedded.stop();
      await this.embedded.start();
      await waitForDatabaseReady(this.getMaintenanceConnectionString());
    }

    await this.startApi();
    await waitForApiHealth(this.baseUrl, this.apiState);
  }

  async shutdown() {
    await this.stopApi().catch(() => {});
    await this.stopMockAuthServer().catch(() => {});
    await this.stopDatabase().catch(() => {});

    if (this.embedded) {
      await this.embedded.stop().catch(() => {});
    }

    if (this.databaseDir) {
      await rm(this.databaseDir, { recursive: true, force: true }).catch(() => {});
    }

    this.client = null;
  }

  async health() {
    const { crmHealthCheck } = await this.loadFrontendClient();
    return crmHealthCheck();
  }

  async getToken() {
    const { getCrmToken } = await this.loadFrontendClient();
    return getCrmToken();
  }

  async setToken(token, persist = true) {
    const { setCrmToken } = await this.loadFrontendClient();
    setCrmToken(token, persist);
  }

  async clearToken() {
    const { clearCrmToken } = await this.loadFrontendClient();
    clearCrmToken();
  }

  async simulateRefresh() {
    this.browserStorage = installBrowserShim(this.baseUrl, this.browserStorage || undefined);
  }

  async queryDatabase(databaseName, sql, values = []) {
    return runSql(this.getMaintenanceConnectionString(databaseName), sql, values);
  }

  async queryMigrations() {
    const { rows } = await this.queryDatabase(this.databaseName, 'SELECT id FROM schema_migrations ORDER BY id');
    return rows.map((row) => row.id);
  }

  async createDatabase(databaseName) {
    await this.queryDatabase('postgres', `CREATE DATABASE ${quoteIdentifier(databaseName)} TEMPLATE template0`);
  }

  async dropDatabase(databaseName) {
    await this.queryDatabase(
      'postgres',
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName],
    );
    await this.queryDatabase('postgres', `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
  }

  async login(email = adminEmail, password = adminPassword) {
    const { crmApiRequest } = await this.loadFrontendClient();
    const session = await crmApiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
      token: '',
    });

    const { setCrmToken } = await this.loadFrontendClient();
    setCrmToken(session.token);
    return session;
  }

  async list(resource, options = {}) {
    const { crmList } = await this.loadFrontendClient();
    return crmList(resource, options);
  }

  async get(resource, id, options = {}) {
    const { crmGetOne } = await this.loadFrontendClient();
    return crmGetOne(resource, id, options);
  }

  async create(resource, payload, options = {}) {
    const { crmCreate } = await this.loadFrontendClient();
    return crmCreate(resource, payload, options);
  }

  async update(resource, id, payload, options = {}) {
    const { crmUpdate } = await this.loadFrontendClient();
    return crmUpdate(resource, id, payload, options);
  }

  async remove(resource, id, options = {}) {
    const { crmDelete } = await this.loadFrontendClient();
    return crmDelete(resource, id, options);
  }

  async getSettings() {
    const { fetchReceiptSettings } = await this.loadFrontendClient();
    return fetchReceiptSettings();
  }

  async saveSettings(settings) {
    const { saveReceiptSettings } = await this.loadFrontendClient();
    return saveReceiptSettings(settings);
  }

  async loadSettingsCache() {
    const { loadReceiptSettings } = await this.loadFrontendClient();
    return loadReceiptSettings();
  }
}

export const createHarness = (options = {}) => new CrmRuntimeHarness(options);

export const dbInfo = {
  user: dbUser,
  password: dbPassword,
  host: dbHost,
  port: dockerDbPort,
  adminEmail,
  adminPassword,
  root: repoRoot,
};
