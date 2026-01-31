-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "contentBase64" TEXT,
ADD COLUMN     "mimeType" TEXT;

-- AlterTable
ALTER TABLE "Swift" ADD COLUMN     "adminStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "rejectionReason" TEXT;
