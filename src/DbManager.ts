import { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma.ts";

export class DbManager {
  prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  reset() {
    this.prisma.user.deleteMany({});
  }
}
