const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const path = require('path');
require('dotenv').config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const photoQueue = new Queue('photo-processing', { connection });

module.exports = {
  photoQueue,
  connection,
};
