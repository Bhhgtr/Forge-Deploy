// Custom error for Git operation failures
export class GitOperationError extends Error {
  public readonly operation: string;
  public readonly originalError: Error | undefined;

  constructor(operation: string, message: string, originalError?: Error) {
    super(`Git ${operation} failed: ${message}`);
    this.name = "GitOperationError";
    this.operation = operation;
    this.originalError = originalError;
  }
}

// Custom error for GitHub API failures
export class GitHubAPIError extends Error {
  public readonly statusCode: number | undefined;
  public readonly endpoint: string;
  public readonly originalError: Error | undefined;

  constructor(
    endpoint: string,
    message: string,
    statusCode?: number,
    originalError?: Error,
  ) {
    super(`GitHub API error [${endpoint}]: ${message}`);
    this.name = "GitHubAPIError";
    this.endpoint = endpoint;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}
