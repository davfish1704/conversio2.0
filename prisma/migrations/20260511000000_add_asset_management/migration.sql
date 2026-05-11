-- Migration: add_asset_management
-- Hand-written to avoid shadow DB issues.
-- Safe to apply to production as-is.

-- ─── Step 1 ─────────────────────────────────────────────────────────────────
-- Create BrainAssetType enum (same values as the existing AssetType enum).
-- We do this first so Step 2 can cast to it.
CREATE TYPE "BrainAssetType" AS ENUM (
  'AUDIO_MEMO',
  'PDF_DOC',
  'IMAGE_ASSET',
  'TEXT_SNIPPET',
  'TEMPLATE',
  'KNOWLEDGE_BASE'
);

-- ─── Step 2 ─────────────────────────────────────────────────────────────────
-- Migrate board_assets.type: AssetType → BrainAssetType.
-- Safe USING cast (identical string values). board_assets has 0 rows in prod,
-- but the USING clause makes it safe regardless of row count.
ALTER TABLE "board_assets"
  ALTER COLUMN "type" TYPE "BrainAssetType"
  USING "type"::text::"BrainAssetType";

-- ─── Step 3 ─────────────────────────────────────────────────────────────────
-- Drop the old AssetType enum. board_assets.type is now BrainAssetType;
-- no other table references AssetType at this point.
DROP TYPE "AssetType";

-- ─── Step 4 ─────────────────────────────────────────────────────────────────
-- Create the new AssetType enum for R2-backed media assets.
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'PDF', 'AUDIO', 'VIDEO', 'DOCUMENT');

-- ─── Step 5 ─────────────────────────────────────────────────────────────────
-- Create the assets table (R2-backed file uploads, scoped per board).
CREATE TABLE "assets" (
  "id"          TEXT         NOT NULL,
  "boardId"     TEXT         NOT NULL,
  "name"        TEXT         NOT NULL,
  "description" TEXT,
  "type"        "AssetType"  NOT NULL,
  "mimeType"    TEXT         NOT NULL,
  "sizeBytes"   INTEGER      NOT NULL,
  "r2Key"       TEXT         NOT NULL,
  "publicUrl"   TEXT         NOT NULL,
  "tags"        TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "uploadedBy"  TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- ─── Step 6 ─────────────────────────────────────────────────────────────────
-- Create the asset_states junction table (asset ↔ state many-to-many).
CREATE TABLE "asset_states" (
  "id"        TEXT         NOT NULL,
  "assetId"   TEXT         NOT NULL,
  "stateId"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "asset_states_pkey" PRIMARY KEY ("id")
);

-- ─── Step 7 ─────────────────────────────────────────────────────────────────
-- Indexes for assets.
CREATE UNIQUE INDEX "assets_r2Key_key"        ON "assets"("r2Key");
CREATE        INDEX "assets_boardId_idx"      ON "assets"("boardId");
CREATE        INDEX "assets_boardId_type_idx" ON "assets"("boardId", "type");
CREATE        INDEX "assets_tags_idx"         ON "assets" USING GIN ("tags");

-- ─── Step 8 ─────────────────────────────────────────────────────────────────
-- Indexes for asset_states.
CREATE        INDEX  "asset_states_stateId_idx"        ON "asset_states"("stateId");
CREATE UNIQUE INDEX  "asset_states_assetId_stateId_key" ON "asset_states"("assetId", "stateId");

-- NOTE: "board_assets_boardId_type_idx" already exists in the DB — not recreated.

-- ─── Step 9 ─────────────────────────────────────────────────────────────────
-- Foreign keys.
ALTER TABLE "assets"
  ADD CONSTRAINT "assets_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "boards"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "asset_states"
  ADD CONSTRAINT "asset_states_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "assets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "asset_states"
  ADD CONSTRAINT "asset_states_stateId_fkey"
  FOREIGN KEY ("stateId") REFERENCES "states"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
