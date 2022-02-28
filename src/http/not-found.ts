import { Http2ServerRequest, Http2ServerResponse } from "http2";

export const notFoundHandler = (
  req: Http2ServerRequest,
  res: Http2ServerResponse
) => {
  if (res.headersSent) return;
  if (res.writableEnded) return;
  res.writeHead(404);
  res.end("Not Found");
};
