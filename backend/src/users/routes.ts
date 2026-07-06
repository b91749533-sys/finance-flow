import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getSettings,
  updateSettings,
} from './controllers';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Apply auth to all routes in this module
router.use(authenticate);

// Profile
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Accounts
router.get('/accounts', getAccounts);
router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);
router.delete('/accounts/:id', deleteAccount);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
