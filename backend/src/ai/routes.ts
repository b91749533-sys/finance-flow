import { Router } from 'express';
import {
  handleAiChat,
  handleGetRecommendations,
  handleDetectSubscriptions,
} from './controllers';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/chat', handleAiChat);
router.get('/recommendations', handleGetRecommendations);
router.get('/detect-subscriptions', handleDetectSubscriptions);

export default router;
