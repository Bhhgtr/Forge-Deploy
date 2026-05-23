import { simpleGit } from "simple-git";
import fs from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { GitOperationError } from "./errors/error.js";
import { ensureEnvRepo } from "./repoManager.js";

export async function prepareRollbackCommit(
  imageTag: string,
  branchName: string,
): Promise<void> {
  if (!config.github.baseBranch) {
    throw new Error("GITHUB_BASE_BRANCH not configured");
  }

  const repoPath = await ensureEnvRepo();
  const git = simpleGit(repoPath);

  const baseBranch = config.github.baseBranch;

  try {
    await git.checkout(baseBranch);
  } catch (error) {
    throw new GitOperationError(
      "checkout",
      `Failed to checkout ${baseBranch}`,
      error instanceof Error ? error : undefined,
    );
  }

  try {
    await git.pull("origin", baseBranch);
  } catch (error) {
    throw new GitOperationError(
      "pull",
      `Failed to pull from origin/${baseBranch}`,
      error instanceof Error ? error : undefined,
    );
  }

  try {
    await git.checkoutLocalBranch(branchName);
  } catch (error) {
    throw new GitOperationError(
      "checkoutLocalBranch",
      `Failed to create branch ${branchName}`,
      error instanceof Error ? error : undefined,
    );
  }

  const rolloutPath = path.join(repoPath, "apps/demo-app/rollout.yml");

  let content: string;
  try {
    content = fs.readFileSync(rolloutPath, "utf-8");
  } catch (error) {
    throw new GitOperationError(
      "readFile",
      `Failed to read ${rolloutPath}`,
      error instanceof Error ? error : undefined,
    );
  }

  const updated = content.replace(
    /image:\s*ghcr\.io\/bhhgtr\/demo-app:.*/,
    `image: ghcr.io/bhhgtr/demo-app:${imageTag}`,
  );

  try {
    fs.writeFileSync(rolloutPath, updated);
  } catch (error) {
    throw new GitOperationError(
      "writeFile",
      `Failed to write ${rolloutPath}`,
      error instanceof Error ? error : undefined,
    );
  }

  try {
    await git.add(rolloutPath);
    await git.commit(`Rollback to image ${imageTag}`);
  } catch (error) {
    throw new GitOperationError(
      "commit",
      `Failed to commit changes`,
      error instanceof Error ? error : undefined,
    );
  }

  try {
    await git.push("origin", branchName);
  } catch (error) {
    throw new GitOperationError(
      "push",
      `Failed to push to origin/${branchName}`,
      error instanceof Error ? error : undefined,
    );
  }
}
