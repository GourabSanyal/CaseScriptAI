import { createServer } from './create-server.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const server = createServer();

server.listen(config.port, () => {
  // Intentionally no PHI / paths — startup only.
  console.log(`hacktoberfest-api listening on :${config.port}`);
});
