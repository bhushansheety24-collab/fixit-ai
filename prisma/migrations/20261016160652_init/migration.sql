-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ItemSeverity" AS ENUM ('minor', 'moderate', 'major', 'critical', 'unknown');

-- CreateEnum
CREATE TYPE "Repairability" AS ENUM ('likely_repairable', 'possibly_repairable', 'unlikely_repairable', 'not_repairable', 'unknown');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RepairRequestStatus" AS ENUM ('PENDING', 'QUOTE_PROVIDED', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SustainabilityActivityType" AS ENUM ('REPAIR', 'REPLACE', 'REUSE', 'RECYCLE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "sessionState" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_analysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "purchasePrice" DECIMAL(12,2),
    "itemAge" INTEGER,
    "condition" TEXT,
    "problemDescription" TEXT NOT NULL,
    "symptoms" TEXT,
    "warrantyInfo" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiAnalysis" JSONB,
    "aiProvider" TEXT,
    "severity" "ItemSeverity" DEFAULT 'unknown',
    "repairability" "Repairability" DEFAULT 'unknown',
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "troubleshooting_conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "troubleshooting_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_professional" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceArea" TEXT,
    "serviceAreaGeo" DOUBLE PRECISION,
    "serviceAreaGeoLon" DOUBLE PRECISION,
    "startingPrice" DECIMAL(12,2),
    "workingHours" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "profileImageUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_request" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3),
    "quotedPrice" DECIMAL(12,2),
    "status" "RepairRequestStatus" NOT NULL DEFAULT 'PENDING',
    "statusHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "repairRequestId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sustainability_record" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "activityType" "SustainabilityActivityType" NOT NULL,
    "actualRepairCost" DECIMAL(12,2),
    "estimatedReplacementCost" DECIMAL(12,2),
    "estimatedMoneySaved" DECIMAL(12,2),
    "estimatedWasteAvoided" DECIMAL(12,2),
    "calculationMethod" TEXT NOT NULL,
    "dataSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sustainability_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_event" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "item_analysis_userId_createdAt_idx" ON "item_analysis"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "item_analysis_category_idx" ON "item_analysis"("category");

-- CreateIndex
CREATE INDEX "troubleshooting_conversation_userId_createdAt_idx" ON "troubleshooting_conversation"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "troubleshooting_conversation_analysisId_idx" ON "troubleshooting_conversation"("analysisId");

-- CreateIndex
CREATE INDEX "chat_message_conversationId_createdAt_idx" ON "chat_message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "repair_professional_verified_idx" ON "repair_professional"("verified");

-- CreateIndex
CREATE INDEX "repair_professional_serviceArea_idx" ON "repair_professional"("serviceArea");

-- CreateIndex
CREATE INDEX "repair_request_userId_createdAt_idx" ON "repair_request"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "repair_request_professionalId_idx" ON "repair_request"("professionalId");

-- CreateIndex
CREATE INDEX "repair_request_status_idx" ON "repair_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "review_repairRequestId_key" ON "review"("repairRequestId");

-- CreateIndex
CREATE INDEX "review_professionalId_idx" ON "review"("professionalId");

-- CreateIndex
CREATE INDEX "review_userId_idx" ON "review"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sustainability_record_analysisId_key" ON "sustainability_record"("analysisId");

-- CreateIndex
CREATE INDEX "sustainability_record_userId_createdAt_idx" ON "sustainability_record"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "sustainability_record_activityType_idx" ON "sustainability_record"("activityType");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE INDEX "rate_limit_event_key_createdAt_idx" ON "rate_limit_event"("key", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_analysis" ADD CONSTRAINT "item_analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "troubleshooting_conversation" ADD CONSTRAINT "troubleshooting_conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "troubleshooting_conversation" ADD CONSTRAINT "troubleshooting_conversation_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "item_analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "troubleshooting_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request" ADD CONSTRAINT "repair_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request" ADD CONSTRAINT "repair_request_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "item_analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_request" ADD CONSTRAINT "repair_request_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "repair_professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "repair_professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "repair_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sustainability_record" ADD CONSTRAINT "sustainability_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sustainability_record" ADD CONSTRAINT "sustainability_record_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "item_analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
