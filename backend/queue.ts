import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Usually Redis runs on localhost:6379 in development
const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null
});

export const deepResearchQueue = new Queue('DeepResearch', {
    connection
});
