import { Router } from 'express';
import {
  getNotifications,
  markRead,
  deleteNotification,
} from './controllers';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.put('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
