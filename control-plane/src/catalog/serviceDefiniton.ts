export interface ServiceDefinition {
  name: string;
  owner: string;
  slos: {
    name: string;
    target: number;
  }[];
  deploymentStrategy: "canary" | "blue-green";
  rollbackStrategy: "git-revert" | "image-rollback";
  runbookUrl: string;
  costBudget?: number;
}
