import { Router, Request, Response } from 'express';
import { BACKEND_THEME_CATEGORIES, BACKEND_THEMES } from '../services/themeRegistry';

const router = Router();

// GET /api/themes - Get all registered theme categories and theme metadata
router.get('/', (req: Request, res: Response) => {
  return res.json({
    categories: BACKEND_THEME_CATEGORIES,
    themes: BACKEND_THEMES
  });
});

export default router;
