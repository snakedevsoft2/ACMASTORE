-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "facebookDomainVerification" TEXT,
ADD COLUMN     "googleSiteVerification" TEXT,
ADD COLUMN     "metaPixelId" TEXT,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;
