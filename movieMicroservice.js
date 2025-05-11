const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');

// Load movie.proto
const movieProtoPath = 'movie.proto';
const movieProtoDefinition = protoLoader.loadSync(movieProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const movieProto = grpc.loadPackageDefinition(movieProtoDefinition).movie;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/movies_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'));

// Define Movie Schema
const movieSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
});
const Movie = mongoose.model('Movie', movieSchema);

// Kafka setup
const kafka = new Kafka({
  clientId: 'movie-service',
  brokers: ['localhost:9092'],
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'movie-group' });

const sendMessage = async (topic, message) => {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
  await producer.disconnect();
};

const consumeMessages = async (topic) => {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());
      console.log(`Received movie message:`, data);
      if (data.action === 'create') {
        const { id, title, description } = data;
        try {
          const existingMovie = await Movie.findOne({ id });
          if (!existingMovie) {
            const movie = new Movie({ id, title, description });
            await movie.save();
            console.log(`Saved movie ${id} to MongoDB`);
          }
        } catch (err) {
          console.error(`Error saving movie ${id}:`, err);
        }
      }
    },
  });
};

// Start consumer
consumeMessages('movies_topic');

// Implement movie service
const movieService = {
  getMovie: async (call, callback) => {
    try {
      const movie = await Movie.findOne({ id: call.request.movie_id });
      if (!movie) {
        return callback({ code: grpc.status.NOT_FOUND, message: 'Movie not found' });
      }
      callback(null, { movie });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },
  searchMovies: async (call, callback) => {
    try {
      const { query } = call.request;
      const movies = await Movie.find({
        title: { $regex: query || '', $options: 'i' },
      });
      callback(null, { movies });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },
  createMovie: async (call, callback) => {
    try {
      const { id, title, description } = call.request.movie;
      const existingMovie = await Movie.findOne({ id });
      if (existingMovie) {
        return callback({ code: grpc.status.ALREADY_EXISTS, message: 'Movie ID already exists' });
      }
      const movie = new Movie({ id, title, description });
      await movie.save();
      await sendMessage('movies_topic', { action: 'create', id, title, description });
      callback(null, { movie });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },
};

// Create and start gRPC server
const server = new grpc.Server();
server.addService(movieProto.MovieService.service, movieService);
const port = 50051;
server.bindAsync(
  `0.0.0.0:${port}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error('Server binding failed:', err);
      return;
    }
    console.log(`Server running on port ${port}`);
    server.start();
  }
);
console.log(`Movie microservice running on port ${port}`);