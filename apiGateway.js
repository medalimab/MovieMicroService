const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');

const movieProtoPath = 'movie.proto';
const tvShowProtoPath = 'tvShow.proto';
const resolvers = require('./resolvers');
const typeDefs = require('./schema');

const app = express();

const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const tvShowProtoDefinition = protoLoader.loadSync(tvShowProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;
const tvShowProto = grpc.loadPackageDefinition(tvShowProtoDefinition).tvShow;

// Kafka setup
const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: ['localhost:9092'],
});
const producer = kafka.producer();

const sendMessage = async (topic, message) => {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
  await producer.disconnect();
};

// Apollo Server
const server = new ApolloServer({ typeDefs, resolvers });
server.start().then(() => {
  app.use(cors(), bodyParser.json(), expressMiddleware(server));
});

// REST Endpoints
app.get('/movies', (req, res) => {
  const client = new movieProto.MovieService(
    'localhost:50051',
    grpc.credentials.createInsecure()
  );
  client.searchMovies({ query: req.query.query || '' }, (err, response) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(response.movies);
  });
});

app.get('/movies/:id', (req, res) => {
  const client = new movieProto.MovieService(
    'localhost:50051',
    grpc.credentials.createInsecure()
  );
  client.getMovie({ movie_id: req.params.id }, (err, response) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(response.movie);
  });
});

app.post('/movies', async (req, res) => {
  const { id, title, description } = req.body;
  if (!id || !title || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const client = new movieProto.MovieService(
    'localhost:50051',
    grpc.credentials.createInsecure()
  );
  client.createMovie({ movie: { id, title, description } }, async (err, response) => {
    if (err) res.status(500).json({ error: err.message });
    else {
      await sendMessage('movies_topic', { action: 'create', id, title, description });
      res.json(response.movie);
    }
  });
});

app.get('/tvshows', (req, res) => {
  const client = new tvShowProto.TVShowService(
    'localhost:50052',
    grpc.credentials.createInsecure()
  );
  client.searchTvshows({ query: req.query.query || '' }, (err, response) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(response.tv_shows);
  });
});

app.get('/tvshows/:id', (req, res) => {
  const client = new tvShowProto.TVShowService(
    'localhost:50052',
    grpc.credentials.createInsecure()
  );
  client.getTvshow({ tv_show_id: req.params.id }, (err, response) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json(response.tv_show);
  });
});

app.post('/tvshows', async (req, res) => {
  const { id, title, description } = req.body;
  if (!id || !title || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const client = new tvShowProto.TVShowService(
    'localhost:50052',
    grpc.credentials.createInsecure()
  );
  client.createTvshow({ tv_show: { id, title, description } }, async (err, response) => {
    if (err) res.status(500).json({ error: err.message });
    else {
      await sendMessage('tvshows_topic', { action: 'create', id, title, description });
      res.json(response.tv_show);
    }
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});