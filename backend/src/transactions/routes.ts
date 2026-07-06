import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import {
  getTransactions,
  getCategories,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  bulkCategorizeTransactions,
  exportCSV,
  importCSV,
  uploadReceipt,
} from './controllers';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Images and PDFs only!'));
    }
  },
});

// CSV parser in-memory storage
const csvUpload = multer({ storage: multer.memoryStorage() });

// Apply auth to all routes in this module
router.use(authenticate);

// Transactions CRUD
router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

// Categories listing
router.get('/categories', getCategories);

// Bulk Operations
router.post('/bulk-delete', bulkDeleteTransactions);
router.post('/bulk-categorize', bulkCategorizeTransactions);

// Data Import/Export
router.get('/export', exportCSV);
router.post('/import', csvUpload.single('file'), importCSV);

// Receipt Upload
router.post('/receipt', upload.single('receipt'), uploadReceipt);

export default router;
