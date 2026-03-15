-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "archetypeId" INTEGER,
ADD COLUMN     "archetypeName" TEXT,
ADD COLUMN     "gnnScore" DOUBLE PRECISION,
ADD COLUMN     "tractId" TEXT;

-- CreateTable
CREATE TABLE "Pantry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "hours" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pantry_pkey" PRIMARY KEY ("id")
);
