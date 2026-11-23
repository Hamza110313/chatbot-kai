import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildSystemInstruction,
  formatConversationHistory,
  generateSmartTitle,
  getGeminiClient,
  getVertexFallbackClient,
  parseGeminiError,
  resolveModel,
} from './src/lib/gemini.ts';
import type { ChatRequestPayload } from './src/types/chat.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env and .env.local if present, without overriding platform Secrets
for (const envFile of ['.env.local', '.env']) {
  const fullPath = path.resolve(__dirname, envFile);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/chat', async (req, res) => {
    const body = (req.body ?? {}) as Partial<ChatRequestPayload>;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    if (rawMessages.length === 0) {
      res.status(400).json({
        code: 'INVALID_REQUEST',
        error: 'At least one message is required.',
      });
      return;
    }

    const sanitizedMessages = rawMessages
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-40);

    if (sanitizedMessages.length === 0) {
      res.status(400).json({
        code: 'INVALID_REQUEST',
        error: 'Messages cannot be empty.',
      });
      return;
    }

    let aborted = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        aborted = true;
      }
    });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const writeEvent = (payload: Record<string, unknown>) => {
      if (aborted || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const ai = getGeminiClient();
      const model = resolveModel(body.model);
      const systemInstruction = buildSystemInstruction(
        body.language ?? 'auto',
        body.tone ?? 'balanced',
        body.systemPrompt
      );
      const contents = formatConversationHistory(sanitizedMessages);

      const openStream = async (client: ReturnType<typeof getGeminiClient>) =>
        client.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction,
          },
        });

      let stream;
      try {
        stream = await openStream(ai);
      } catch (primaryErr) {
        const parsedPrimary = parseGeminiError(primaryErr);
        const vertexClient =
          parsedPrimary.status === 401 ? getVertexFallbackClient() : null;
        if (!vertexClient) {
          throw primaryErr;
        }
        try {
          stream = await openStream(vertexClient);
        } catch {
          throw primaryErr;
        }
      }

      for await (const chunk of stream) {
        if (aborted) {
          break;
        }
        const text = chunk.text;
        if (text) {
          writeEvent({ text });
        }
      }

      if (!aborted) {
        writeEvent({ done: true });
      }
      if (!res.writableEnded) {
        res.end();
      }
    } catch (err) {
      const parsed = parseGeminiError(err);
      if (parsed.status >= 500) {
        console.error(
          `[Kai API Error] status=${parsed.status} code=${parsed.code} detail=${parsed.detail}`
        );
      } else {
        console.warn(
          `[Kai API Warning] status=${parsed.status} code=${parsed.code}`
        );
      }
      writeEvent({
        error: parsed.userMessage,
        code: parsed.code,
        status: parsed.status,
      });
      if (!res.writableEnded) {
        res.end();
      }
    }
  });

  app.post('/api/title', async (req, res) => {
    const firstMessage =
      typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!firstMessage) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }
    const title = await generateSmartTitle(firstMessage);
    res.json({ title });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kai server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
