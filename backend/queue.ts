import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Usually Redis runs on localhost:6379 in development
const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null
});

// cast to any to avoid strict typing mismatch between ioredis instance and bullmq connection typings
export const deepResearchQueue = new Queue('DeepResearch', {
    connection: connection as any,
} as any);
