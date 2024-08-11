import EventEmitter from "node:events";
import fs from "node:fs";
import {
  createServer,
  IncomingMessage,
  Server,
  ServerResponse,
} from "node:http";
import { Readable } from "node:stream";
import { IMAGE_SERVER_PORT } from "./constants.ts";
import { join } from "node:path";
import { toKebabCase } from "./util/toKebabCase.ts";

type EventMap = {};

export class ImageReceiver extends EventEmitter<EventMap> {
  server: Server;

  constructor() {
    super();

    this.server = createServer(this.handleRequest.bind(this));
  }

  handleRequest(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== "POST" || !req.url) {
      return res.end();
    }
    const url = new URL(req.url, `http://domain.com`);
    const query = url.searchParams;
    const timestamp = query.get("timestamp") as string;
    const deviceId = query.get("deviceId") as string;

    this.handleImageRecord(deviceId, new Date(timestamp), req);
  }

  handleImageRecord(deviceId: string, timestamp: Date, stream: Readable) {
    console.log("Received image from", deviceId, timestamp);
    const filename = join(
      import.meta.dirname,
      "../images",
      toKebabCase(`image-${deviceId}-${timestamp.getTime()}.jpeg`)
    );
    const writeStream = fs.createWriteStream(filename);
    stream.pipe(writeStream);
  }

  start() {
    const hostname = "0.0.0.0";
    const port = IMAGE_SERVER_PORT;
    this.server.listen(
      {
        host: hostname,
        port,
      },
      () => {
        console.log(`Image server listening on ${hostname}:${port}`);
      }
    );
  }

  destroy() {
    this.server.close();
  }
}
