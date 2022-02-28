import { Http2ServerRequest } from "http2";

export const readBodyString = async (req: Http2ServerRequest) => {
  const buffers = [];
  for await (const chunk of req) buffers.push(chunk);
  return Buffer.concat(buffers).toString();
};
