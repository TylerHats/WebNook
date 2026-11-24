import { Router, Request, Response } from 'express';
import { getLegalDocuments } from '../services/legalService';

const router = Router();

// GET /api/legal/documents - Dynamically generated Terms & Conditions and Privacy Policy for this instance
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const docs = await getLegalDocuments(req);
    return res.json(docs);
  } catch (err) {
    console.error('Legal documents generation error:', err);
    return res.status(500).json({ error: 'Failed to load legal documents' });
  }
});

export default router;

