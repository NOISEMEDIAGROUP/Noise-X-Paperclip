import { Router } from 'express';
import { aiIntelligenceService } from '../services/ai-intelligence.js';
import { assertBoard } from './authz.js';
import type { Db } from '@paperclipai/db';

export function aiIntelligenceRoutes(db: Db) {
  const router = Router();
  const ai = aiIntelligenceService(db);

  /**
   * GET /api/ai/suggestions
   * Get AI-generated suggestions for company optimization
   */
  router.get('/companies/:companyId/suggestions', async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;

    try {
      const suggestions = await ai.generateSuggestions(companyId);
      res.json({ suggestions });
    } catch (error) {
      console.error('[AI Intelligence] Failed to generate suggestions:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  });

  /**
   * GET /api/ai/problems
   * Get detected problems requiring attention
   */
  router.get('/companies/:companyId/problems', async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;

    try {
      const problems = await ai.detectProblems(companyId);
      res.json({ problems });
    } catch (error) {
      console.error('[AI Intelligence] Failed to detect problems:', error);
      res.status(500).json({ error: 'Failed to detect problems' });
    }
  });

  /**
   * GET /api/ai/insights
   * Get comprehensive AI insights (suggestions + problems)
   */
  router.get('/companies/:companyId/insights', async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId;

    try {
      const insights = await ai.getInsights(companyId);
      res.json(insights);
    } catch (error) {
      console.error('[AI Intelligence] Failed to get insights:', error);
      res.status(500).json({ error: 'Failed to get insights' });
    }
  });

  /**
   * POST /api/ai/decompose
   * Decompose a high-level task into subtasks
   */
  router.post('/decompose', async (req, res) => {
    assertBoard(req);
    const { title, description } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    try {
      const decomposition = await ai.decomposeTask(title, description);
      res.json(decomposition);
    } catch (error) {
      console.error('[AI Intelligence] Failed to decompose task:', error);
      res.status(500).json({ error: 'Failed to decompose task' });
    }
  });

  return router;
}
