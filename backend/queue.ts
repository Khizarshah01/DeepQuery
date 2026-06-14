import { Queue } from 'bullmq';
import Redis from 'ioredis';

let connection: Redis | null = null;
let deepResearchQueue: Queue | null = null;

try {
    // Usually Redis runs on localhost:6379 in development
    connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
        maxRetriesPerRequest: null,
        retryStrategy: () => null, // Disable retries to fail fast
        lazyConnect: true, // Don't connect immediately
    });
    
    // Try to connect
    connection.connect().catch(() => {
        console.warn('Redis connection failed - research queue disabled');
        connection = null;
    });
    
    if (connection) {
        // cast to any to avoid strict typing mismatch between ioredis instance and bullmq connection typings
        deepResearchQueue = new Queue('DeepResearch', {
            connection: connection as any,
        } as any);
    }
} catch (e) {
    console.warn('Failed to initialize Redis queue:', (e as Error).message);
    connection = null;
    deepResearchQueue = null;
}

export { deepResearchQueue, connection };
