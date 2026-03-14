-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DONOR', 'GOV', 'ADMIN');

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DONOR',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "description_es" TEXT,
    "addressStreet1" TEXT,
    "addressStreet2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "website" TEXT,
    "resourceTypeId" TEXT,
    "resourceTypeName" TEXT,
    "resourceStatusId" TEXT,
    "openByAppointment" BOOLEAN NOT NULL DEFAULT false,
    "appointmentRequired" BOOLEAN NOT NULL DEFAULT false,
    "acceptingNewClients" BOOLEAN NOT NULL DEFAULT true,
    "confidence" DOUBLE PRECISION,
    "ratingAverage" DOUBLE PRECISION,
    "waitTimeMinutesAverage" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER,
    "mergedToResourceId" TEXT,
    "contacts" JSONB NOT NULL DEFAULT '[]',
    "images" JSONB NOT NULL DEFAULT '[]',
    "shifts" JSONB NOT NULL DEFAULT '[]',
    "occurrences" JSONB NOT NULL DEFAULT '[]',
    "occurrenceSkipRanges" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "regionsServed" JSONB NOT NULL DEFAULT '[]',
    "resourceSlugs" JSONB NOT NULL DEFAULT '[]',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sentiment" TEXT,
    "tags" TEXT[],
    "resourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CensusData" (
    "id" TEXT NOT NULL,
    "tractId" TEXT NOT NULL,
    "povertyIndex" DOUBLE PRECISION NOT NULL,
    "population" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CensusData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stakeholder_email_key" ON "Stakeholder"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CensusData_tractId_key" ON "CensusData"("tractId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
