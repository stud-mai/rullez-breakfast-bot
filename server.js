const fastify = require('fastify')({
  logger: false,
});

fastify.get('/', (request, reply) => {
  reply.send({ ping: 'pong' });
});

fastify.listen(3000, (err, address) => {
  if (err) throw err;
  console.log(`Server listening on ${address}`);
});
