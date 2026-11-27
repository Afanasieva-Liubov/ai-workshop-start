// The local web view: a page with a field for a repository link, and the scan behind it as JSON.
// It listens on 127.0.0.1 only and, like the CLI, stores nothing.
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { AtlasError } from './core/errors.ts';
import { skillLink } from './core/model.ts';
import { scan, type Source } from './core/scan.ts';

const PAGE = readFileSync(new URL('./web.html', import.meta.url), 'utf8');

export type WebOptions = {
  /** Opens what the user asked to scan, as the CLI does. */
  open(input: string): Promise<Source>;
  /** 0 picks a free port. */
  port: number;
};

/** Starts the web view; resolves to the running server and its URL. */
export async function serve({ open, port }: WebOptions): Promise<{ server: Server; url: string }> {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const send = (status: number, type: string, body: string) => {
      response.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' });
      response.end(body);
    };
    // Listening on 127.0.0.1 does not stop DNS rebinding: a page on another name could read local files.
    const address = server.address();
    const own = typeof address === 'object' && address ? [`127.0.0.1:${address.port}`, `localhost:${address.port}`] : [];
    if (!own.includes(request.headers.host?.toLowerCase() ?? '')) return send(403, 'text/plain', 'Forbidden: unknown Host');
    if (request.method !== 'GET') return send(405, 'text/plain', 'Method not allowed');
    if (url.pathname === '/') return send(200, 'text/html', PAGE);
    if (url.pathname !== '/api/scan') return send(404, 'text/plain', 'Not found');
    const repository = url.searchParams.get('repository')?.trim();
    if (!repository) return send(400, 'application/json', JSON.stringify({ error: 'Enter a GitHub URL or a directory' }));
    try {
      const result = await scan(await open(repository));
      const skills = result.skills.map((skill) => ({ ...skill, link: skillLink(result.repository, skill) }));
      send(200, 'application/json', JSON.stringify({ ...result, skills }));
    } catch (error) {
      if (!(error instanceof AtlasError)) {
        send(500, 'application/json', JSON.stringify({ error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` }));
        return;
      }
      send(400, 'application/json', JSON.stringify({ error: error.message }));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      const why = { EADDRINUSE: 'is in use', EACCES: 'is not allowed for this user' }[error.code ?? ''];
      reject(why ? new AtlasError(`Port ${port} ${why}; try another: skill-atlas serve <port>`) : error);
    });
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  const actual = typeof address === 'object' && address ? address.port : port;
  return { server, url: `http://127.0.0.1:${actual}/` };
}
