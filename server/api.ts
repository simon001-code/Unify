import { Request, Response, Router } from 'express';
import { getActiveProviderConfig, MessageTriageInput, triageMessage } from './provider.ts';

export const apiRouter = Router();

// 1. Provider status
apiRouter.get('/provider-info', (_req: Request, res: Response) => {
  const config = getActiveProviderConfig();
  res.json({
    success: true,
    provider: config.provider,
    apiModel: config.apiModel,
    apiKeyConfigured: config.apiKeyConfigured,
    ollamaEndpoint: config.ollamaEndpoint,
    ollamaModel: config.ollamaModel,
  });
});

// 2. Triage & Draft reply with Gemma 4
apiRouter.post('/triage', async (req: Request, res: Response) => {
  try {
    const input: MessageTriageInput = req.body;
    if (!input || !input.message) {
      res.status(400).json({
        success: false,
        error: 'Message text is required.',
      });
      return;
    }

    const result = await triageMessage(input);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during triage';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// 3. Smoke test endpoint (allows running the test from the UI or HTTP)
apiRouter.get('/smoke-test', async (_req: Request, res: Response) => {
  const sampleInput: MessageTriageInput = {
    message: "Hi! Is that vintage 90s leather trench coat you posted on Instagram still available? Can you hold it for me until tomorrow afternoon? I can pick it up at 3pm.",
    customerName: "Sarah Jenkins",
    channel: "instagram",
    storeName: "Velvet & Thread Boutique",
    tone: "friendly",
  };

  try {
    const result = await triageMessage(sampleInput);
    res.json({
      status: 'PASS',
      provider: result.providerUsed,
      model: result.modelUsed,
      category: result.category,
      suggestedReply: result.suggestedReply,
      recommendedSchedule: result.recommendedSchedule,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Smoke test error';
    res.status(500).json({
      status: 'FAIL',
      error: message,
    });
  }
});
