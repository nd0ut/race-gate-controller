import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

process.once('SIGINT', () => prisma.$disconnect())
process.once('SIGTERM', () => prisma.$disconnect())