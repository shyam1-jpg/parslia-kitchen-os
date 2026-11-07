import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface Received {
  method: string;
  path: string;
  headers: IncomingMessage["headers"];
  body: string;
}

export async function startMock(
  handler: (req: IncomingMessage, res: ServerResponse, body: string) => void | Promise<void>,
): Promise<{ url: string; hits: Received[]; close: () => Promise<void> }> {
  const hits: Received[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      hits.push({ method: req.method ?? "", path: req.url ?? "", headers: req.headers, body });
      Promise.resolve(handler(req, res, body)).catch(() => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end();
        }
      });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Mock server has no port.");
  return {
    url: `http://127.0.0.1:${address.port}`,
    hits,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

export function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}
