import axios from "axios";
import { config } from "../../config/index.js";
import { GitHubAPIError } from "./errors/error.js";

export async function createRollbackPR(
  branchName: string,
  commitMessage: string,
  prTitle: string,
  prBody: string,
): Promise<string> {
  if (!config.github.PR_Token) {
    throw new Error("Missing GITHUB_TOKEN");
  }

  const client = axios.create({
    baseURL: `https://api.github.com/repos/${config.github.owner}/${config.github.repo}`,
    headers: {
      Authorization: `Bearer ${config.github.PR_Token}`,
      Accept: "application/vnd.github+json",
    },
  });

  try {
    const response = await client.post("/pulls", {
      title: prTitle,
      head: `${config.github.owner}:${branchName}`,
      base: config.github.baseBranch,
      body: prBody,
    });

    return response.data.html_url;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const message = error.response?.data?.message || error.message;

      if (statusCode === 401) {
        throw new GitHubAPIError(
          "/pulls",
          "Authentication failed - check GITHUB_TOKEN",
          statusCode,
          error,
        );
      }
      if (statusCode === 403) {
        throw new GitHubAPIError(
          "/pulls",
          "Rate limit exceeded or insufficient permissions",
          statusCode,
          error,
        );
      }
      if (statusCode === 422) {
        throw new GitHubAPIError(
          "/pulls",
          `Validation failed: ${message}`,
          statusCode,
          error,
        );
      }

      throw new GitHubAPIError("/pulls", message, statusCode, error);
    }

    throw new GitHubAPIError(
      "/pulls",
      "Unknown error creating pull request",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
}
