import { Router } from 'express';
import { getDashboardStats, getAuditLogs, uploadAdminImage } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadMiddleware } from '../middleware/upload.middleware.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Protect all admin meta routes with Admin authorization
router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/dashboard-stats', getDashboardStats);
router.get('/audit-logs', getAuditLogs);
router.post('/upload-image', uploadMiddleware.single('image'), uploadAdminImage);

export default router;

