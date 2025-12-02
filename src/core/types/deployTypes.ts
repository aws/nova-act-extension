export interface DeploymentPageProps {
  // No props needed - uses context
}

export interface CredentialsMessage {
  success: boolean;
  identity?: { Arn?: string };
  isRefresh?: boolean;
}

export interface DeployResultMessage {
  command: 'deployResult';
  success: boolean;
  output?: string;
  error?: string;
}

export interface InvocationResultMessage {
  type: 'invokeRuntimeResult';
  success: boolean;
  response?: unknown;
  error?: string;
}

export interface ProgressMessage {
  type: 'deployProgress' | 'invokeRuntimeProgress';
  output: string;
}

export interface DependencyValidationResult {
  type: 'dependencyValidationResult';
  valid: boolean;
  errors: string[];
}
