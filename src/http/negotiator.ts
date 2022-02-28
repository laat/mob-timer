import { Http2ServerRequest, Http2ServerResponse } from "http2";
import Negotiator from "negotiator";

declare module "http2" {
  interface Http2ServerRequest {
    negotiator: Negotiator;
  }
}

export const contentNegotiator = (
  req: Http2ServerRequest,
  res: Http2ServerResponse
) => {
  req.negotiator = new Negotiator(req);
};
