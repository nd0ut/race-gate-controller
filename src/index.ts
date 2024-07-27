import { Server } from "./Server.ts";

const server = new Server();
server.start();

process.once('SIGINT', () => server.stop())
process.once('SIGTERM', () => server.stop())
