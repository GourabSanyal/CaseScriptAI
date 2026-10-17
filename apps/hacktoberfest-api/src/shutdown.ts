import type http from 'node:http';
import type { DbPool } from './db/client.js';

export type ShutdownDeps = {
  server: http.Server;
  pool?: DbPool;
};

/** Stop accepting connections and close the Postgres pool. */
export const shutdownServer = async (deps: ShutdownDeps): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    deps.server.close((err) => (err ? reject(err) : resolve()));
  });
  if (deps.pool) {
    await deps.pool.end();
  }
};

export const attachSigtermHandler = (
  deps: ShutdownDeps,
  onSignal: (handler: () => void) => void = (handler) => {
    process.on('SIGTERM', handler);
  },
): (() => Promise<void>) => {
  let shuttingDown = false;
  const run = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await shutdownServer(deps);
  };
  onSignal(() => {
    void run().catch(() => {
      // Avoid logging PHI; exit after best-effort close.
      process.exitCode = 1;
    });
  });
  return run;
};
