import Ajv, { DefinedError, JSONSchemaType } from "ajv";
import { createReadStream } from "fs";
import { finished } from "stream/promises";
import { stat } from "fs/promises";
import { Http2ServerRequest, Http2ServerResponse } from "http2";
import { ISseEvent, SSE_EVENT } from "./buffer/interface.js";
import { readBodyString } from "./http/read-body-string.js";
import { PutTimer, Room } from "./room.js";
import { IRoomConfig } from "./types.js";

const ajv = new Ajv();

const ROOM_PATH_RE = /^\/[A-Za-z0-9-]+\/?$/;
const ROOM_CONFIG_PATH_RE = /^\/[A-Za-z0-9-]+\/config\/?$/;

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

  if (!ROOM_PATH_RE.test(req.url)) return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  const roomHtml = "public/room.html";
  const { size } = await stat(roomHtml);

  res.writeHead(200, { "content-type": "text/html", "content-length": size });

  if (req.method === "HEAD") return res.end();

  var readStream = createReadStream(roomHtml);
  readStream.pipe(res);

  await finished(readStream);
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

  if (!ROOM_PATH_RE.test(req.url)) return;

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

const putSchema: JSONSchemaType<PutTimer> = {
  oneOf: [
    {
      type: "object",
      properties: {
        timer: { type: "integer" },
        user: { type: "string" },
      },
      required: ["timer"],
    },
    {
      type: "object",
      properties: {
        breaktimer: { type: "integer" },
        user: { type: "string" },
      },
      required: ["breaktimer"],
    },
  ] as any,
};
const validatePut = ajv.compile(putSchema);

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
  if (!ROOM_PATH_RE.test(req.url)) return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  const data = JSON.parse(await readBodyString(req));

  const valid = validatePut(data);
  if (!valid) {
    const err = validatePut.errors?.[0] as DefinedError;
    res.writeHead(400, { "content-type": "text/plain" });
    res.end(`${err.instancePath} ${err.message}`);
    return;
  }

  const text = await room.putTimer(data);
  res.writeHead(200, { "content-type": "text/plain" });
  if (text) {
    // cli prints this text
    res.write(`|\n`);
    res.write(`| ${text}\n`);
    res.write(`|\n`);
    res.end();
  } else {
    res.end();
  }
};

const roomConfigSchema: JSONSchemaType<Required<IRoomConfig>> = {
  type: "object",
  properties: {
    breakEvery: { type: "integer" },
    breakMinutes: { type: "integer" },
    minutes: { type: "integer" },
  },
  required: ["minutes", "breakMinutes", "breakEvery"],
};
const validateRoomConfig = ajv.compile(roomConfigSchema);

/**
 * @example
 * ```http
 * POST /:room-name/config
 * Content-Type: application/json
 *
 * { "minutes": 10, "breakMinutes": 5, "breakEvery": 3 }
 * ```
 */
const postConfig = async (
  req: Http2ServerRequest,
  res: Http2ServerResponse
) => {
  if (req.method !== "POST") return;
  if (req.headers["content-type"] !== "application/json") return;

  if (!ROOM_CONFIG_PATH_RE.test(req.url)) return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  const data = JSON.parse(await readBodyString(req));

  const valid = validateRoomConfig(data);
  if (!valid) {
    const err = validatePut.errors?.[0] as DefinedError;
    res.writeHead(400, { "content-type": "text/plain" });
    res.end(`${err.instancePath} ${err.message}`);
    return;
  }

  await room.setConfig(data);
  res.writeHead(200, { "content-type": "text/plain" });
  res.end();
};

/**
 * @example
 * ```http
 * GET /:room-name/config
 * Accept: application/json
 * ```
 */
const getConfig = async (req: Http2ServerRequest, res: Http2ServerResponse) => {
  if (req.method !== "GET") return;
  if (req.headers.accept !== "application/json") return;

  if (!ROOM_CONFIG_PATH_RE.test(req.url)) return;

  const room = await Room.getOrCreate(req);
  if (!room) return;

  const config = await room.getConfig();
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(config));
};

export const roomHandlers = [
  roomSseHandler,
  putHandler,
  getRoomHtmlHandler,
  postConfig,
  getConfig,
];
