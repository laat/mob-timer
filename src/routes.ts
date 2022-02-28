import Ajv, { DefinedError, JSONSchemaType } from "ajv";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Http2ServerRequest, Http2ServerResponse } from "http2";
import { ISseEvent, SSE_EVENT } from "./buffer/interface.js";
import { PutTimer, Room } from "./room.js";

const ajv = new Ajv();

const availableGetMimeTypes = ["text/html", "text/event-stream"];

/**
 * @example
 * ```http
 * GET /:room-name
 * Accept: text/html
 * ```
 */
const getRoomHtmlHandler = async (
  req: Http2ServerRequest,
  res: Http2ServerResponse
) => {
  if (req.method !== "GET" && req.method !== "HEAD") return;
  const mediaType = req.negotiator.mediaType(availableGetMimeTypes);
  if (mediaType !== "text/html") return;

  const pathname = new URL(req.url, "http://example.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 1) return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  const roomHtml = "public/room.html";
  const { size } = await stat(roomHtml);
  res.writeHead(200, {
    "content-type": "text/html",
    "content-length": size,
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }
  var readStream = createReadStream(roomHtml);
  readStream.pipe(res);

  return new Promise<void>((resolve, reject) => {
    readStream.on("error", (err) => reject(err));
    readStream.on("end", () => resolve(undefined));
  });
};

/**
 * @example
 * ```http
 * GET /:room-name
 * Accept: text/event-stream
 * ```
 */
const roomSseHandler = async (
  req: Http2ServerRequest,
  res: Http2ServerResponse
) => {
  if (req.method !== "GET" && req.method !== "HEAD") return;
  const mediaType = req.negotiator.mediaType(availableGetMimeTypes);
  if (mediaType !== "text/event-stream") return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    ...(req.httpVersionMajor === 1 ? { connection: "keep-alive" } : {}),
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.write(`retry: 2000\n`);

  const send = (message: ISseEvent) => {
    message.id && res.write(`id: ${message.id}\n`);
    message.event && res.write(`event: ${message.event}\n`);
    res.write(`data: ${message.data}\n\n`);
  };
  const messages = await room.getSseMessages(req.headers["last-event-id"]);
  for (const replayMessage of messages) send(replayMessage);

  const keepAlive = setInterval(() => res.write(":keep-alive\n\n"), 15000);
  req.once("close", () => clearInterval(keepAlive));

  room.on(SSE_EVENT, send);
  req.once("close", () => room.removeListener(SSE_EVENT, send));

  // server closes the room
  const close = () => res.end(`event: close\n`);
  room.once("close", close);
  req.once("close", () => room.removeListener("close", close));
};

const schema: JSONSchemaType<PutTimer> = {
  oneOf: [
    {
      type: "object",
      properties: {
        timer: { type: "integer" },
        user: { type: "string" },
      },
      required: ["timer", "user"],
    },
    {
      type: "object",
      properties: {
        breaktimer: { type: "integer" },
        user: { type: "string" },
      },
      required: ["breaktimer", "user"],
    },
  ] as any,
};
const validatePut = ajv.compile(schema);

/**
 * @example
 * ```http
 * PUT /:room-name
 * Content-Type: application/json
 *
 * { "timer": 10, "user": "me" }
 * ```
 */
const putHandler = async (
  req: Http2ServerRequest,
  res: Http2ServerResponse
) => {
  if (req.method !== "PUT") return;
  if (req.headers["content-type"] !== "application/json") return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const data = JSON.parse(Buffer.concat(buffers).toString());

  const valid = validatePut(data);
  if (!valid) {
    const err = validatePut.errors?.[0] as DefinedError;
    res.writeHead(400, { "content-type": "text/plain" });
    res.end(`${err.instancePath} ${err.message}`);
  } else {
    await room.putTimer(data);
    res.writeHead(200, { "content-type": "text/plain" });
    res.end();
  }
};

const postConfig = async (
  req: Http2ServerRequest,
  res: Http2ServerResponse
) => {
  if (req.method !== "POST") return;
  if (req.headers["content-type"] !== "application/json") return;
  const pathname = new URL(req.url, "https://example.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return;
  if (parts[1] !== "config") return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  const data = JSON.parse(Buffer.concat(buffers).toString());

  await room.setConfig(data);

  res.writeHead(200, { "content-type": "text/plain" });
  res.end();
};

const getConfig = async (req: Http2ServerRequest, res: Http2ServerResponse) => {
  if (req.method !== "GET") return;
  if (req.headers.accept !== "application/json") return;

  const pathname = new URL(req.url, "https://example.com").pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return;
  if (parts[1] !== "config") return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  res.writeHead(200, { "content-type": "application/json" });
  const config = await room.getConfig();
  res.end(JSON.stringify(config));
};

export const roomHandlers = [
  roomSseHandler,
  putHandler,
  getRoomHtmlHandler,
  postConfig,
  getConfig,
];
