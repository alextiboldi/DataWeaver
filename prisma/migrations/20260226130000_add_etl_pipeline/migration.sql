CREATE TABLE "EtlPipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceDataSourceId" TEXT NOT NULL,
    "destDataSourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversationId" TEXT,
    CONSTRAINT "EtlPipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EtlMapping" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceQuery" TEXT NOT NULL DEFAULT '',
    "destTable" TEXT NOT NULL,
    "columnMappings" JSONB NOT NULL DEFAULT '{}',
    "conflictStrategy" TEXT NOT NULL DEFAULT 'insert',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EtlMapping_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EtlPipeline" ADD CONSTRAINT "EtlPipeline_sourceDataSourceId_fkey" FOREIGN KEY ("sourceDataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EtlPipeline" ADD CONSTRAINT "EtlPipeline_destDataSourceId_fkey" FOREIGN KEY ("destDataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EtlPipeline" ADD CONSTRAINT "EtlPipeline_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EtlMapping" ADD CONSTRAINT "EtlMapping_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "EtlPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
