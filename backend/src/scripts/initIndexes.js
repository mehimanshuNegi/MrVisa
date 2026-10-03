import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { Visa } from '../models/Visa.js';
import { Country } from '../models/Country.js';
import { Document } from '../models/Document.js';
import { Payment } from '../models/Payment.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuditLog } from '../models/AuditLog.js';

async function initIndexes() {
  logger.info('Starting production database index synchronization...');
  await connectDatabase();

  const models = [
    { name: 'Application', model: Application },
    { name: 'User', model: User },
    { name: 'Visa', model: Visa },
    { name: 'Country', model: Country },
    { name: 'Document', model: Document },
    { name: 'Payment', model: Payment },
    { name: 'RefreshToken', model: RefreshToken },
    { name: 'AuditLog', model: AuditLog }
  ];

  for (const { name, model } of models) {
    try {
      logger.info(`Syncing indexes for collection: ${name}...`);
      if (name === 'Payment') {
        try {
          const currentIndices = await model.collection.indexes();
          const pOrderIdx = currentIndices.find((i) => i.name === 'providerOrderId_1');
          if (pOrderIdx && !pOrderIdx.unique) {
            await model.collection.dropIndex('providerOrderId_1');
            logger.info('Dropped non-unique legacy providerOrderId_1 index on Payment collection.');
          }
        } catch {
          // Ignore if index doesn't exist
        }
      }
      await model.syncIndexes();
      const indexes = await model.collection.indexes();
      logger.info(`Successfully synchronized ${indexes.length} indexes for ${name}:`, indexes.map(i => i.name));
    } catch (err) {
      logger.error(`Error synchronizing indexes for ${name}:`, { error: err.message });
      throw err;
    }
  }

  logger.info('All production database indexes successfully built and synchronized.');
  await disconnectDatabase();
}

initIndexes().catch((err) => {
  logger.error('Index migration script failed:', err);
  process.exit(1);
});
