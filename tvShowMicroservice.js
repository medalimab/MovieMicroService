const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const mongoose = require('mongoose');
const { Kafka } = require('kafkajs');

// Load tvShow.proto
const tvShowProtoPath = 'tvShow.proto';
const tvShowProtoDefinition = protoLoader.loadSync(tvShowProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const tvShowProto = grpc.loadPackageDefinition(tvShowProtoDefinition).tvShow;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tvshows_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'));

// Define TVShow Schema
const tvShowSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
});
const TVShow = mongoose.model('TVShow', tvShowSchema);

// Kafka setup
const kafka = new Kafka({
  clientId: 'tvshow-service',
  brokers: ['localhost:9092'],
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'tvshow-group' });

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
      console.log(`Received TV show message:`, data);
      if (data.action === 'create') {
        const { id, title, description } = data;
        try {
          const existingShow = await TVShow.findOne({ id });
          if (!existingShow) {
            const tv_show = new TVShow({ id, title, description });
            await tv_show.save();
            console.log(`Saved TV show ${id} to MongoDB`);
          }
        } catch (err) {
          console.error(`Error saving TV show ${id}:`, err);
        }
      }
    },
  });
};

// Start consumer
consumeMessages('tvshows_topic');

// Implement TV show service
const tvShowService = {
  getTvshow: async (call, callback) => {
    try {
      const tv_show = await TVShow.findOne({ id: call.request.tv_show_id });
      if (!tv_show) {
        return callback({ code: grpc.status.NOT_FOUND, message: 'TV show not found' });
      }
      callback(null, { tv_show });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },
  searchTvshows: async (call, callback) => {
    try {
      const { query } = call.request;
      const tv_shows = await TVShow.find({
        title: { $regex: query || '', $options: 'i' },
      });
      callback(null, { tv_shows });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },
  createTvshow: async (call, callback) => {
    try {
      const { id, title, description } = call.request.tv_show;
      const existingShow = await TVShow.findOne({ id });
      if (existingShow) {
        return callback({ code: grpc.status.ALREADY_EXISTS, message: 'TV show ID already exists' });
      }
      const tv_show = new TVShow({ id, title, description });
      await tv_show.save();
      await sendMessage('tvshows_topic', { action: 'create', id, title, description });
      callback(null, { tv_show });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },
};

// Create and start gRPC server
const server = new grpc.Server();
server.addService(tvShowProto.TVShowService.service, tvShowService);
const port = 50052;
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
console.log(`TV show microservice running on port ${port}`);