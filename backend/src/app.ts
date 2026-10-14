import express, { type ErrorRequestHandler, type Request as ExpressRequest, type Response as ExpressResponse } from 'express';
import { serverConfig } from './config';
import { GET as adminElectionsGet, POST as adminElectionsPost } from './routes/admin-elections';
import { GET as adminMetricsGet } from './routes/admin-metrics';
import { GET as agreementGet, POST as agreementPost } from './routes/agreement';
import { GET as auditGet } from './routes/audit';
import { POST as authPost } from './routes/auth';
import { POST as blockchainRetryPost } from './routes/blockchain-retry';
import { GET as cronOutboxGet } from './routes/cron-outbox';
import { GET as electionAuditExportGet } from './routes/election-audit-export';
import { GET as electionTransparencyGet } from './routes/election-transparency';
import { GET as electionsGet } from './routes/elections';
import { GET as healthGet } from './routes/health';
import { POST as logoutPost } from './routes/logout';
import { GET as meGet } from './routes/me';
import { POST as platformSignPost } from './routes/platform-sign';
import { POST as privateRegisterPost } from './routes/private-register';
import { POST as privateJoinPost } from './routes/private-join';
import { GET as privateJoinDataGet } from './routes/private-join-data';
import { POST as privateMessagePost } from './routes/private-message';
import { GET as readyGet } from './routes/ready';
import { POST as recallPost } from './routes/recall';
import { POST as verifyPost } from './routes/verify';
import { POST as votePost } from './routes/vote';

type Handler = (request: Request) => Promise<Response> | Response;
type ParameterHandler = (request: Request, id: string) => Promise<Response>;

function webRequest(req: ExpressRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (name === 'content-length' || name === 'transfer-encoding' || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item);
  }
  const body = req.method === 'GET' || req.method === 'HEAD' || !req.body
    ? undefined : new Uint8Array(req.body as Buffer);
  return new Request(`http://localhost${req.originalUrl}`, { method: req.method, headers, body });
}

async function send(res: ExpressResponse, response: Response) {
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') res.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
}

function adapt(handler: Handler | ParameterHandler) {
  return async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const request = webRequest(req);
      const id = req.params.id;
      if (Array.isArray(id)) {
        res.status(400).set('Cache-Control', 'no-store').json({ error: 'Invalid election ID' });
        return;
      }
      const response = id
        ? await (handler as ParameterHandler)(request, id)
        : await (handler as Handler)(request);
      await send(res, response);
    } catch {
      res.status(503).set('Cache-Control', 'no-store').json({ error: 'Service unavailable.' });
    }
  };
}

const app = express();
app.disable('x-powered-by');
let validated = false;
app.use((_req, res, next) => {
  try {
    if (!validated) {
      serverConfig();
      validated = true;
    }
    next();
  } catch {
    res.status(503).set('Cache-Control', 'no-store').json({ error: 'Service unavailable. Check server configuration.' });
  }
});
app.use(express.raw({ type: () => true, limit: '16kb' }));

const routes: Array<[string, Partial<Record<'get' | 'post', Handler | ParameterHandler>>]> = [
  ['/api/admin/elections', { get: adminElectionsGet, post: adminElectionsPost }],
  ['/api/admin/metrics', { get: adminMetricsGet }],
  ['/api/agreement', { get: agreementGet, post: agreementPost }],
  ['/api/audit', { get: auditGet }],
  ['/api/auth', { post: authPost }],
  ['/api/blockchain/retry', { post: blockchainRetryPost }],
  ['/api/cron/outbox', { get: cronOutboxGet }],
  ['/api/elections/:id/audit-export', { get: electionAuditExportGet }],
  ['/api/elections/:id/transparency', { get: electionTransparencyGet }],
  ['/api/elections', { get: electionsGet }],
  ['/api/health', { get: healthGet }],
  ['/api/logout', { post: logoutPost }],
  ['/api/me', { get: meGet }],
  ['/api/platform/sign', { post: platformSignPost }],
  ['/api/private/register', { post: privateRegisterPost }],
  ['/api/private/join', { post: privateJoinPost }],
  ['/api/private/join-data', { get: privateJoinDataGet }],
  ['/api/private/message', { post: privateMessagePost }],
  ['/api/ready', { get: readyGet }],
  ['/api/recall', { post: recallPost }],
  ['/api/verify', { post: verifyPost }],
  ['/api/vote', { post: votePost }],
];
for (const [path, methods] of routes) {
  if (methods.get) app.get(path, adapt(methods.get));
  if (methods.post) app.post(path, adapt(methods.post));
  app.all(path, (_req, res) => res.status(405).set('Allow', Object.keys(methods).join(', ').toUpperCase()).set('Cache-Control', 'no-store').json({ error: 'Method not allowed' }));
}
app.use((_req, res) => res.status(404).set('Cache-Control', 'no-store').json({ error: 'Not found' }));
const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  void _next;
  const status = typeof error === 'object' && error !== null && 'status' in error && error.status === 413 ? 413 : 503;
  res.status(status).set('Cache-Control', 'no-store').json({ error: status === 413 ? 'Request is too large' : 'Service unavailable.' });
};
app.use(errorHandler);

export default app;
