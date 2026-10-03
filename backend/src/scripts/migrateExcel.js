import { seedExcelDatabase } from './seedExcelDatabase.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

export async function migrateExcelDatabase(filePath = null) {
  return seedExcelDatabase(filePath);
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('migrateExcel.js')) {
  (async () => {
    try {
      const customFile = process.argv[2] || null;
      await connectDatabase();
      await migrateExcelDatabase(customFile);
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      logger.error('Excel migration execution failed:', { error: err.message, stack: err.stack });
      process.exit(1);
    }
  })();
}

export default migrateExcelDatabase;
