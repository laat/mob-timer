import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Http2ServerRequest, Http2ServerResponse } from "http2";
import mime from "mime-types";
import { join, normalize } from "path";

export const createStaticHandler =
  (root: string) =>
  async (req: Http2ServerRequest, res: Http2ServerResponse) => {
    if (res.headersSent) return;
    if (res.writableEnded) return;
    if (req.method !== "GET" && req.method !== "HEAD") {
      return;
    }
    const pathname = new URL(req.url, "http://example.com").pathname;
    const filePath = safeDecode(
      root,
      pathname === "/" ? "/index.html" : pathname
    );

    if (filePath == null) {
      return;
    }

    const stat = await tryStat(filePath);
    if (stat?.isFile()) {
      if (res.headersSent) return;
      if (res.writableEnded) return;

      const mimetype = mime.lookup(filePath);
      res.writeHead(200, {
        ...(mimetype ? { "content-type": mimetype } : {}),
        "content-length": stat.size,
      });

      if (req.method === "HEAD") {
        res.end();
        return;
      }

      var readStream = createReadStream(filePath);
      readStream.pipe(res);
      return new Promise<void>((resolve, reject) => {
        readStream.on("error", (err) => reject(err));
        readStream.on("end", () => resolve(undefined));
      });
    }
  };

const tryStat = async (path: string) => {
  try {
    return await stat(path);
  } catch (e) {
    return null;
  }
};
const safeDecode = (root: string, pathname: string) => {
  if (pathname.includes("\0")) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(pathname);
    const normalized = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
    const joined = join(root, normalized);
    if (joined.indexOf(root) != 0) {
      return null;
    }
    return joined;
  } catch (err) {
    return null;
  }
};
