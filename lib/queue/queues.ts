import { Queue } from 'bullmq';
import { redis } from './redis';

export interface ScanJobData {
  brandId: string;
  weekOf:  string; // ISO string
}

export const scanQueue = new Queue<ScanJobData>('scans', {
  connection:     redis,
  defaultJobOptions: {
    attempts:    3,
    backoff:     { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 50 },
  },
});
