import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { GitOperationError } from "./errors/error.js";

export async function ensureEnvRepo(): Promise<string> {
  if (!config.github.repoPath) {
    throw new Error("GITHUB_REPO_PATH not configured");
  }
  if (!config.github.repoUrl) {
    throw new Error("GITHUB_REPO_URL not configured");
  }

  const repoPath = path.resolve(config.github.repoPath);
  const repoUrl = config.github.repoUrl;

  if (!fs.existsSync(repoPath)) {
    console.log("Cloning environment repository...");
    try {
      await simpleGit().clone(repoUrl, repoPath);
    } catch (error) {
      throw new GitOperationError(
        "clone",
        `Failed to clone ${repoUrl}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  return repoPath;
}
