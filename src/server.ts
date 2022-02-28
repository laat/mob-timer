// prototype pollution protection.
// If a library needs to modify the Object prototype, it sucks, and you should
// use a different library.
Object.freeze(Object.prototype);

import { readFileSync } from "fs";
import {
  createSecureServer,
  Http2ServerRequest,
  Http2ServerResponse,
} from "http2";
import { contentNegotiator } from "./http/negotiator.js";
import { notFoundHandler } from "./http/not-found.js";
import { createStaticHandler } from "./http/static-files.js";
import { roomHandlers } from "./routes.js";

type Handler =
  | ((req: Http2ServerRequest, res: Http2ServerResponse) => Promise<void>)
  | ((req: Http2ServerRequest, res: Http2ServerResponse) => void);

const handlers: Handler[] = [
  contentNegotiator,
  createStaticHandler("public"),
  ...roomHandlers,
  notFoundHandler,
];

const server = createSecureServer(
  {
    key: readFileSync("localhost-key.pem"),
    cert: readFileSync("localhost.pem"),
    allowHTTP1: true,
  },
  async (req, res) => {
    try {
      for (const handler of handlers) {
        await handler(req, res);
        if (res.headersSent) break;
        if (res.writableEnded) return;
      }
    } catch (err) {
      !res.headersSent && res.writeHead(500);
      !res.writableEnded && res.end("Internal Server Error");
      console.error(err);
    }
  }
);

server.on("error", (err) => console.error(err));
server.listen(3000);
