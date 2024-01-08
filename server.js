// This server is needed to overcome issue https://github.com/yagop/node-telegram-bot-api/issues/682#issuecomment-1826755352

// Import the HTTP module
const http = require('http');

// Configure HTTP server to respond with "Hello, World!" to all requests
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('This is Rullez Breakfast Telegram Bot!\n');
});

// Listen on port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
