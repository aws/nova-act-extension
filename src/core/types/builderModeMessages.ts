// Builder Mode webview communication types
import { type ChromeDevToolsTab, type Template } from './builder';
import { type CommonToExtensionMessage } from './commonMessages';
import { type DependencyValidationResult } from './deployTypes';
import { type TabName } from './sidebarMessages';

/* -------------------------------------------------------------------------- */
/*             Messages FROM builder mode webview TO extension                */
/* -------------------------------------------------------------------------- */
export interface RunPythonCommand {
  command: 'runPython';
  code: string;
  cellId: string;
}

export interface StopExecutionCommand {
  command: 'stopExecution';
}

export interface FetchDevToolsCommand {
  command: 'fetchChromeDevToolsUrl';
  url: string;
}

interface OpenPythonFileCommand {
  command: 'openPythonFile';
}

interface SetApiKeyCommand {
  command: 'setApiKey';
}

interface SavePythonFileCommand {
  command: 'savePythonFile';
  content: string;
  cellCount: number;
  lineCount: number;
  location?: string;
}

export type FileCommand = OpenPythonFileCommand | SavePythonFileCommand;

export interface ShowErrorCommand {
  command: 'showError';
  error: string;
}

export interface ShowInfoCommand {
  command: 'showInfo';
  info: string;
}

export interface RestartPanelCommand {
  command: 'restartPanel';
  content: string[];
}

export interface ReadyCommand {
  command: 'ready';
}

export interface RestartPythonProcess {
  command: 'restartPythonProcess';
  restart?: boolean;
}

export interface OpenActionViewerCommand {
  command: 'openActionViewer';
  htmlFilePath?: string;
  actionViewerFilePath?: string;
  actionViewerFolderPath?: string;
}

export interface GetPreference {
  command: 'getPreference';
  key: string;
}

export interface SetPreference {
  command: 'setPreference';
  key: string;
  value: boolean;
}

export interface DeployScript {
  command: 'deployScript';
  name: string;
  region: string;
  filePath: string;
  executionRoleArn?: string;
}

export interface ValidateDependencies {
  command: 'validateDependencies';
}

export interface InvokeRuntime {
  command: 'invokeRuntime';
  name: string;
  payload: string;
}

export interface ListWorkflows {
  command: 'listWorkflows';
  region: string;
}

export interface SetActiveWorkflow {
  command: 'setActiveWorkflow';
  workflowName: string;
}

export interface ValidateAwsCredentials {
  command: 'validateAwsCredentials';
  isRefresh?: boolean;
}

export interface ValidateWorkflowScript {
  command: 'validateWorkflowScript';
  filePath: string;
  agentName: string;
}

export interface BuilderModeCommand {
  command: 'builderMode';
  template?: Template;
  initialTab?: TabName;
}

export interface ViewWorkflowDetailsCommand {
  command: 'viewWorkflowDetails';
}

export interface ViewIamPermissionsCommand {
  command: 'viewIamPermissions';
}

export interface ViewDeploymentDocumentationCommand {
  command: 'viewDeploymentDocumentation';
}

export interface ViewRunDocumentationCommand {
  command: 'viewRunDocumentation';
}

export interface ViewNovaActStepDetailsCommand {
  command: 'viewNovaActStepDetails';
}

export interface CheckApiKeyStatusCommand {
  command: 'checkApiKeyStatus';
}

export interface GetApiKeyCommand {
  command: 'getApiKey';
}

export interface ApplyConversion {
  command: 'applyConversion';
  filePath: string;
  convertedCode: string;
  agentName: string;
}

export interface OpenExternalUrlCommand {
  command: 'openExternalUrl';
  url: string;
}

export type BuilderModeToExtensionMessage =
  | CommonToExtensionMessage
  | RunPythonCommand
  | RestartPythonProcess
  | FetchDevToolsCommand
  | FileCommand
  | ShowErrorCommand
  | ShowInfoCommand
  | StopExecutionCommand
  | RestartPanelCommand
  | SetApiKeyCommand
  | ReadyCommand
  | OpenActionViewerCommand
  | GetPreference
  | SetPreference
  | DeployScript
  | ValidateDependencies
  | InvokeRuntime
  | ListWorkflows
  | SetActiveWorkflow
  | ValidateAwsCredentials
  | BuilderModeCommand
  | ViewWorkflowDetailsCommand
  | ViewIamPermissionsCommand
  | ViewDeploymentDocumentationCommand
  | ViewRunDocumentationCommand
  | ViewNovaActStepDetailsCommand
  | ValidateWorkflowScript
  | CheckApiKeyStatusCommand
  | GetApiKeyCommand
  | ApplyConversion
  | OpenExternalUrlCommand;

/* -------------------------------------------------------------------------- */
/*             Messages FROM extension TO builder mode webview                */
/* -------------------------------------------------------------------------- */
export interface AgentActivity {
  type: 'agentActivity';
  data: string;
  cellId: string;
}

export interface InitMessage {
  type: 'init';
  content: string[];
  initialTab?: string;
}

export interface CellExecutionMessage {
  type: 'stdout' | 'stderr';
  data: string;
  cellId: string;
  success?: boolean;
}

export type CellCompletionStatus = 'completed' | 'failed' | 'aborted';

export type NovaActStatus = 'started' | 'stopped';

export interface CellEndMessage {
  type: 'cell_end';
  cellId: string;
  success: boolean;
  completionStatus: CellCompletionStatus;
  novaActStatus: NovaActStatus;
}

export interface LoadFileMessage {
  type: 'loadFile';
  content: string;
  location: string;
}

export interface FileSavedMessage {
  type: 'fileSaved';
  location: string;
}

export interface ChromeDevToolsResponseMessage {
  type: 'chromeDevToolsResponse';
  success: boolean;
  data?: ChromeDevToolsTab[];
  error?: string;
}

export interface ThemeMessage {
  type: 'theme';
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
}

export interface PythonProcessReloadedMessage {
  type: 'pythonProcessReloaded';
}

export interface GetPreferenceMessage {
  type: 'getPreferenceValue';
  key: string;
  value: boolean;
}

export interface SetPreferenceMessage {
  type: 'setPreferenceValue';
  key: string;
  value: boolean;
}

export interface RuntimeInvocationResult {
  type: 'runtimeInvocationResult';
  success: boolean;
  response?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: string;
}

export interface AwsCredentialsValidationResult {
  type: 'awsCredentialsValidationResult';
  success: boolean;
  identity?: {
    UserId?: string;
    Account?: string;
    Arn?: string;
  };
  error?: string;
  isRefresh?: boolean;
}

export interface InvokeRuntimeResult {
  type: 'invokeRuntimeResult';
  success: boolean;
  response?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: string;
  workflowName: string;
}

export interface WorkflowInfo {
  name: string;
}

export interface WorkflowListResult {
  type: 'workflowListResult';
  workflows: WorkflowInfo[];
  error?: string | null;
}

export interface WorkflowScriptValidationResult {
  type: 'workflowScriptValidationResult';
  success: boolean;
  workflowNameWarning: string;
  headlessWarning: string;
  deploymentFormatWarning: string;
  error?: string;
}

export interface DeploymentResult {
  type: 'deploymentResult';
  success: boolean;
  message: string;
  details?: string;
}

export interface ValidationResult {
  type: 'validationResult';
  docker: boolean;
  novaActCLI: boolean;
  awsCredentials: boolean;
  errors: string[];
}

export interface ActCliPathFoundMessage {
  type: 'actCliPathFound';
  path: string;
}

export interface ApiKeyStatusResult {
  type: 'apiKeyStatusResult';
  hasApiKey: boolean;
}

export interface ApiKeyResult {
  type: 'apiKeyResult';
  apiKey: string | null;
}

export interface ConversionApplied {
  type: 'conversionApplied';
  success: boolean;
  backupPath?: string;
  error?: string;
}

export interface InvokeRuntimeProgress {
  type: 'invokeRuntimeProgress';
  workflowName: string;
  output: string;
}

export interface WorkflowOutputBuffer {
  type: 'workflowOutputBuffer';
  workflowName: string;
  output: string;
}

export type ExtensionToBuilderModeMessage =
  | InitMessage
  | CellExecutionMessage
  | CellEndMessage
  | LoadFileMessage
  | FileSavedMessage
  | ChromeDevToolsResponseMessage
  | AgentActivity
  | ThemeMessage
  | PythonProcessReloadedMessage
  | GetPreferenceMessage
  | SetPreferenceMessage
  | DependencyValidationResult
  | RuntimeInvocationResult
  | AwsCredentialsValidationResult
  | DeploymentResult
  | InvokeRuntimeResult
  | InvokeRuntimeProgress
  | WorkflowOutputBuffer
  | WorkflowListResult
  | ValidationResult
  | WorkflowScriptValidationResult
  | ApiKeyStatusResult
  | ApiKeyResult
  | ConversionApplied;
