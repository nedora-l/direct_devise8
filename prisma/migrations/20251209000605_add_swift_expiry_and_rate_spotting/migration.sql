-- AlterTable
ALTER TABLE "Swift" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "rateStrategy" TEXT DEFAULT 'auction',
ADD COLUMN     "rateTriggeredAt" TIMESTAMP(3),
ADD COLUMN     "targetCurrency" TEXT,
ADD COLUMN     "targetRate" DOUBLE PRECISION;
