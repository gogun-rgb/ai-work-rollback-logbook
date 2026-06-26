export type Project = {
  id: string;
  name: string;
  path: string;
  branch: string;
  createdAt: string;
  updatedAt: string;
  lastScannedAt: string | null;
};

export type ChangeDecision = "KEEP" | "RESTORE" | "UNDECIDED";

export type GitChange = {
  filePath: string;
  oldPath?: string;
  porcelainStatus: string;
  gitStatus: string;
  additions: number;
  deletions: number;
  decision: ChangeDecision;
  statusSignature: string;
};

export type GitScan = {
  branch: string;
  changes: GitChange[];
  summary: {
    total: number;
    added: number;
    modified: number;
    deleted: number;
    renamed: number;
    untracked: number;
  };
};

export type DiffResult = {
  filePath: string;
  type: "diff" | "preview" | "binary" | "empty";
  content: string;
  truncated: boolean;
  lineCount: number;
  message?: string;
};

export type WorkLogSummary = {
  id: string;
  title: string;
  aiTool: string;
  result: string;
  createdAt: string;
  project: Project;
  counts: {
    total: number;
    keep: number;
    restorePlanned: number;
    restored: number;
  };
};

export type FileChangeRecord = {
  id: string;
  filePath: string;
  gitStatus: string;
  additions: number;
  deletions: number;
  decision: ChangeDecision;
  statusSignature: string | null;
  restoreStatus: string | null;
  restoreError: string | null;
  restoredAt: string | null;
};

export type WorkLogDetail = {
  id: string;
  projectId: string;
  title: string;
  aiTool: string;
  prompt: string;
  result: string;
  failureCause: string | null;
  errorMessage: string | null;
  attemptedSolution: string | null;
  nextCheck: string | null;
  lesson: string | null;
  nextTaskChecklist: string | null;
  createdAt: string;
  project: Project;
  fileChanges: FileChangeRecord[];
};
