-- Enable pgvector extension (Neon supports this natively)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to assets
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Add embedding column to brain_documents
ALTER TABLE "brain_documents" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- HNSW index for cosine similarity on assets
CREATE INDEX IF NOT EXISTS "assets_embedding_hnsw_idx"
  ON "assets" USING hnsw ("embedding" vector_cosine_ops);

-- HNSW index for cosine similarity on brain_documents
CREATE INDEX IF NOT EXISTS "brain_documents_embedding_hnsw_idx"
  ON "brain_documents" USING hnsw ("embedding" vector_cosine_ops);
