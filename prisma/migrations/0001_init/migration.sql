-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastScannedAt" DATETIME
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "aiTool" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "failureCause" TEXT,
    "errorMessage" TEXT,
    "attemptedSolution" TEXT,
    "nextCheck" TEXT,
    "lesson" TEXT,
    "nextTaskChecklist" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workLogId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "gitStatus" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "decision" TEXT NOT NULL DEFAULT 'UNDECIDED',
    "statusSignature" TEXT,
    "restoreStatus" TEXT,
    "restoreError" TEXT,
    "restoredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FileChange_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES "WorkLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_path_key" ON "Project"("path");

-- CreateIndex
CREATE INDEX "WorkLog_projectId_idx" ON "WorkLog"("projectId");

-- CreateIndex
CREATE INDEX "WorkLog_aiTool_idx" ON "WorkLog"("aiTool");

-- CreateIndex
CREATE INDEX "WorkLog_result_idx" ON "WorkLog"("result");

-- CreateIndex
CREATE INDEX "FileChange_workLogId_idx" ON "FileChange"("workLogId");

-- CreateIndex
CREATE INDEX "FileChange_decision_idx" ON "FileChange"("decision");
