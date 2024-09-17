/**
 * Portkey AI Gateway
 *
 * @module index
 */

import { Hono } from 'hono';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';
import { proxyHandler } from './handlers/proxyHandler';
import { proxyGetHandler } from './handlers/proxyGetHandler';
import { chatCompletionsHandler } from './handlers/chatCompletionsHandler';
import { completionsHandler } from './handlers/completionsHandler';
import { embeddingsHandler } from './handlers/embeddingsHandler';
import { requestValidator } from './middlewares/requestValidator';
import { imageGenerationsHandler } from './handlers/imageGenerationsHandler';
import { portkey } from './middlewares/portkey';
import { authNMiddleWare } from './middlewares/auth/authN';
import { customLogHandler } from './handlers/customLogHandler';
import { feedbackHandler } from './handlers/feedbackHandler';
import { logsGetHandler } from './handlers/logsGetHandler';
import { authZMiddleWare } from './middlewares/auth/authZ';
import { AUTH_SCOPES } from './globals';
import { apiKeyRateLimitCheckMiddleware } from './middlewares/rateLimits/apiKeyRateLimitCheck';
import { prometheus } from '@hono/prometheus';
import { prometheusRegister } from './apm';
import { initializeQueuesAndWorkers } from './redis-workers/queueWorkers';
import { redisClient } from './data-stores/redis/index';
import { hooks } from './middlewares/hooks';
import { createSpeechHandler } from './handlers/createSpeechHandler';
import { createTranscriptionHandler } from './handlers/createTranscriptionHandler';
import { createTranslationHandler } from './handlers/createTranslationHandler';

// Create a new Hono server instance
const app = new Hono();

//await initializeQueuesAndWorkers();
console.log('Waiting for Redis client to be ready...');
await new Promise<void>((resolve) => {
  if (
    redisClient &&
    (redisClient.status === 'ready' || redisClient.status === 'connect')
  ) {
    resolve();
  } else {
    const checkInterval = setInterval(() => {
      if (
        redisClient &&
        (redisClient.status === 'ready' || redisClient.status === 'connect')
      ) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  }
});
console.log('Redis client is ready, initializing queues and workers');
await initializeQueuesAndWorkers();
console.log('Queues and workers initialized successfully');

const { registerMetrics } = prometheus({ registry: prometheusRegister });
app.use('*', registerMetrics);

app.get('/v1/health', (c) => {
  c.status(200);
  return c.json({ status: 'success', message: 'Server is healthy' });
});

app.use('*', authNMiddleWare());
app.use('*', apiKeyRateLimitCheckMiddleware());
app.use('*', portkey());

/**
 * GET route for the root path.
 * Returns a greeting message.
 */
app.get('/', (c) => c.text('AI Gateway says hey!'));

// Use prettyJSON middleware for all routes
app.use('*', prettyJSON());

app.use('*', hooks);

/**
 * Default route when no other route matches.
 * Returns a JSON response with a message and status code 404.
 */
app.notFound((c) => c.json({ message: 'Not Found', ok: false }, 404));

/**
 * Global error handler.
 * If error is instance of HTTPException, returns the custom response.
 * Otherwise, logs the error and returns a JSON response with status code 500.
 */
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  c.status(500);
  return c.json({ status: 'failure', message: err.message });
});

/**
 * POST route for '/v1/chat/completions'.
 * Handles requests by passing them to the chatCompletionsHandler.
 */
app.post(
  '/v1/chat/completions',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  chatCompletionsHandler
);

/**
 * POST route for '/v1/completions'.
 * Handles requests by passing them to the completionsHandler.
 */
app.post(
  '/v1/completions',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  completionsHandler
);

/**
 * POST route for '/v1/embeddings'.
 * Handles requests by passing them to the embeddingsHandler.
 */
app.post(
  '/v1/embeddings',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  embeddingsHandler
);

/**
 * POST route for '/v1/images/generations'.
 * Handles requests by passing them to the imageGenerations handler.
 */
app.post(
  '/v1/images/generations',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  imageGenerationsHandler
);

/**
 * POST route for '/v1/audio/speech'.
 * Handles requests by passing them to the createSpeechHandler.
 */
app.post(
  '/v1/audio/speech',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  createSpeechHandler
);

/**
 * POST route for '/v1/audio/transcriptions'.
 * Handles requests by passing them to the createTranscriptionHandler.
 */
app.post(
  '/v1/audio/transcriptions',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  createTranscriptionHandler
);

/**
 * POST route for '/v1/audio/translations'.
 * Handles requests by passing them to the createTranslationHandler.
 */
app.post(
  '/v1/audio/translations',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  createTranslationHandler
);

/**
 * POST route for '/v1/prompts/:id/completions'.
 * Handles portkey prompt completions route
 */
app.post(
  '/v1/prompts/*',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  (c) => {
    if (c.req.url.endsWith('/v1/chat/completions')) {
      return chatCompletionsHandler(c);
    } else if (c.req.url.endsWith('/v1/completions')) {
      return completionsHandler(c);
    }
    c.status(500);
    return c.json({
      status: 'failure',
      message: 'prompt completions error: Something went wrong',
    });
  }
);

app.post(
  '/v1/logs',
  authZMiddleWare([AUTH_SCOPES.LOGS.WRITE]),
  customLogHandler
);
app.get(
  '/v1/logs/:id',
  authZMiddleWare([
    AUTH_SCOPES.LOGS.READ,
    AUTH_SCOPES.COMPLETIONS.WRITE,
    AUTH_SCOPES.LOGS.WRITE,
  ]),
  logsGetHandler
);
app.get(
  '/v1/pull/mongo/:id',
  authZMiddleWare([
    AUTH_SCOPES.LOGS.READ,
    AUTH_SCOPES.COMPLETIONS.WRITE,
    AUTH_SCOPES.LOGS.WRITE,
  ]),
  logsGetHandler
);

app.post(
  '/v1/feedback',
  authZMiddleWare([AUTH_SCOPES.LOGS.WRITE]),
  feedbackHandler
);
app.put(
  '/v1/feedback/:id',
  authZMiddleWare([AUTH_SCOPES.LOGS.WRITE]),
  feedbackHandler
);

// Support the /v1 proxy endpoint after all defined endpoints so this does not interfere.
app.post(
  '/v1/*',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  proxyHandler
);

// Support the /v1 proxy endpoint after all defined endpoints so this does not interfere.
app.get(
  '/v1/*',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  proxyGetHandler
);

app.delete(
  '/v1/*',
  authZMiddleWare([AUTH_SCOPES.COMPLETIONS.WRITE]),
  requestValidator,
  proxyGetHandler
);

export default app;
