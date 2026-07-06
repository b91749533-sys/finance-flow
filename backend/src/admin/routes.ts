import { Router } from 'express';
import {
  getSystemMetrics,
  getUsersList,
  getSystemAuditLogs,
  getFraudAlerts,
  toggleAdminRole,
} from './controllers';
import { authenticate, authorizeAdmin } from '../middlewares/auth';

const router = Router();

// Apply auth + admin validation to all endpoints in this router
router.use(authenticate);
router.use(authorizeAdmin);

router.get('/metrics', getSystemMetrics);
router.get('/users', getUsersList);
router.get('/audit-logs', getSystemAuditLogs);
router.get('/fraud-alerts', getFraudAlerts);
router.put('/users/:id/role', toggleAdminRole);

export default router;
