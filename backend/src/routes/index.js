import { Router } from 'express';
import authRoutes from './auth.routes.js';
import countryRoutes from './country.routes.js';
import visaRoutes from './visa.routes.js';
import applicationRoutes from './application.routes.js';
import documentRoutes from './document.routes.js';
import paymentRoutes from './payment.routes.js';
import adminRoutes from './admin.routes.js';
import documentationRoutes from './documentation.routes.js';
import dummyTicketRoutes from './dummyTicket.routes.js';
import { getHealth, getOcrDiagnostics } from '../controllers/health.controller.js';
import { servePublicMedia } from '../controllers/media.controller.js';

const apiV1Router = Router();

// Health Check & OCR Diagnostics
apiV1Router.get('/health', getHealth);
apiV1Router.get('/health/ocr-diagnostics', getOcrDiagnostics);

// Public Media Stream Route
apiV1Router.get('/media/*', servePublicMedia);

// Core Resource Routes
apiV1Router.use('/auth', authRoutes);
apiV1Router.use('/user', authRoutes); // User profile compatibility alias
apiV1Router.use('/countries', countryRoutes);
apiV1Router.use('/visas', visaRoutes);
apiV1Router.use('/applications', applicationRoutes);
apiV1Router.use('/documents', documentRoutes);
apiV1Router.use('/payments', paymentRoutes);
apiV1Router.use('/admin', adminRoutes);

// Documentation & Dummy Ticket Resource Routes
apiV1Router.use('/documentation-services', documentationRoutes);
apiV1Router.use('/dummy-ticket-services', dummyTicketRoutes);
apiV1Router.use('/dummy-tickets', dummyTicketRoutes); // Alias for clean URL access

export default apiV1Router;
