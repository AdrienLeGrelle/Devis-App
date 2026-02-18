#!/usr/bin/env node
/**
 * Pre-dev check: port 3000 must be free. Exit 1 with clear message if in use.
 * Used by: npm run dev (via predev)
 */
const net = require('net');

const PORT = 3000;

const server = net.createServer((s) => s.end());

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`\u2717 Port ${PORT} is already in use.`);
    console.error('  Stop the other process using port 3000, or run:');
    console.error('  lsof -ti :3000 | xargs kill -9');
    console.error('');
    process.exit(1);
  }
  process.exit(1);
});

server.once('listening', () => {
  server.close(() => process.exit(0));
});

server.listen(PORT, '127.0.0.1');
