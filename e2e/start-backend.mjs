// Starts the FastAPI backend for Playwright on a fresh SQLite database, so e2e runs
// never touch the real (Neon) database and every run starts empty.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

const TMP_DIR = 'e2e/.tmp';
const DB_FILE = `${TMP_DIR}/e2e.db`;

function resolvePython() {
  if (process.env.E2E_PYTHON) return process.env.E2E_PYTHON;
  for (const candidate of ['.venv/Scripts/python.exe', '.venv/bin/python']) {
    if (existsSync(candidate)) return candidate;
  }
  return 'python';
}

const python = resolvePython();
// Real process env vars beat pydantic-settings' .env file, so explicitly setting all
// three keeps a real DATABASE_URL or JWT_SECRET from the shell or .env out of e2e.
const env = {
  ...process.env,
  DATABASE_URL: `sqlite:///./${DB_FILE}`,
  // Must be at least 32 characters; the backend refuses shorter secrets.
  JWT_SECRET: 'e2e-secret-not-for-production-only',
  COOKIE_SECURE: 'false',
};

mkdirSync(TMP_DIR, { recursive: true });
for (const suffix of ['', '-journal', '-wal', '-shm']) {
  rmSync(`${DB_FILE}${suffix}`, { force: true });
}

const migrate = spawnSync(python, ['-m', 'alembic', 'upgrade', 'head'], {
  env,
  stdio: 'inherit',
});
if (migrate.status !== 0) {
  console.error('e2e: database migration failed');
  process.exit(migrate.status ?? 1);
}

const server = spawn(
  python,
  ['-m', 'uvicorn', 'api.index:app', '--host', '127.0.0.1', '--port', '8100'],
  { env, stdio: 'inherit' },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
