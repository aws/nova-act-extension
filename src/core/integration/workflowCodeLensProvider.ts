import * as vscode from 'vscode';

import { Commands } from '../../constants';
import logger from '../utils/logger';

/**
 * CodeLens provider for Workflow scripts
 */
export class WorkflowCodeLensProvider implements vscode.CodeLensProvider {
  private readonly regex: RegExp;
  private readonly _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    this.regex = /with\s+Workflow\s*\(/g;
    logger.log('WorkflowCodeLensProvider constructor called with regex: ' + this.regex);

    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'python') {
        this._onDidChangeCodeLenses.fire();
      }
    });
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (document.languageId !== 'python') {
      return [];
    }

    const text = document.getText();
    if (!this.detectWorkflowImports(text)) {
      return [];
    }

    const matches = this.findWorkflowMatches(document);
    const codeLenses: vscode.CodeLens[] = [];

    for (const match of matches) {
      codeLenses.push(...this.createCodeLensActions(match.range));
    }

    return codeLenses;
  }

  private detectWorkflowImports(text: string): boolean {
    return (
      /from\s+nova_act/.test(text) ||
      /import\s+nova_act/.test(text) ||
      text.includes('from nova_act import') ||
      text.includes('import nova_act')
    );
  }

  private findWorkflowMatches(
    document: vscode.TextDocument
  ): Array<{ range: vscode.Range; line: vscode.TextLine }> {
    const text = document.getText();
    const matches: Array<{ range: vscode.Range; line: vscode.TextLine }> = [];
    let match;

    while ((match = this.regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(match.index).line);
      const indexOf = line.text.indexOf(match[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(position, new RegExp(this.regex));

      if (range) {
        matches.push({ range, line });
      }
    }

    return matches;
  }

  private createCodeLensActions(range: vscode.Range): vscode.CodeLens[] {
    return [
      new vscode.CodeLens(range, {
        title: '📝 View details',
        tooltip: 'View details about Workflow',
        command: Commands.viewWorkflowDetails,
        arguments: ['Workflow'],
      }),
      new vscode.CodeLens(range, {
        title: '🚀 Deploy Workflow',
        tooltip: 'Deploy workflow to AWS',
        command: Commands.deployWorkflow,
        arguments: [{ type: 'workflow' }],
      }),
    ];
  }
}

/**
 * Register WorkflowCodeLens provider and commands
 */
export function registerWorkflowCodeLensProvider(context: vscode.ExtensionContext): void {
  logger.log('Registering Workflow CodeLens provider');
  const codeLensProvider = new WorkflowCodeLensProvider();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'python', scheme: 'file' },
      codeLensProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(Commands.viewWorkflowDetails, handleViewWorkflowDetails),
    vscode.commands.registerCommand(Commands.viewIamPermissions, handleViewIamPermissions),
    vscode.commands.registerCommand(
      Commands.viewDeploymentDocumentation,
      handleViewDeploymentDocumentation
    ),
    vscode.commands.registerCommand(Commands.viewRunDocumentation, handleViewRunDocumentation),
    vscode.commands.registerCommand(Commands.deployWorkflow, handleDeployWorkflow)
  );
}

/**
 * Handle view workflow details command
 */
function handleViewWorkflowDetails(): void {
  logger.log('Opening Workflow documentation panel');
  const panel = vscode.window.createWebviewPanel(
    'workflowDetails',
    'Workflow Details',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getWorkflowDetailsHtml();
}

/**
 * Handle view IAM permissions command
 */
function handleViewIamPermissions(): void {
  logger.log('Opening IAM permissions documentation panel');
  const panel = vscode.window.createWebviewPanel(
    'iamPermissions',
    'Required IAM Permissions',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getIamPermissionsHtml();
}

/**
 * Handle view deployment documentation command
 */
function handleViewDeploymentDocumentation(): void {
  logger.log('Opening deployment documentation panel');
  const panel = vscode.window.createWebviewPanel(
    'deploymentDocumentation',
    'How Deployment Works',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getDeploymentDocumentationHtml();
}

/**
 * Handle view run documentation command
 */
function handleViewRunDocumentation(): void {
  logger.log('Opening Run tab documentation panel');
  const panel = vscode.window.createWebviewPanel(
    'runDocumentation',
    'How the Run Tab Works',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getRunDocumentationHtml();
}

/**
 * Handle deploy workflow command
 */
function handleDeployWorkflow(workflowContext?: { type: string }): void {
  logger.log('Opening Workflow deployment interface');
  vscode.commands.executeCommand(Commands.showBuilderModeDeploy, {
    type: 'workflow',
    context: workflowContext,
  });
}

/**
 * Generate Workflows documentation HTML
 */
function getWorkflowDetailsHtml(): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Workflow Details</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                line-height: 1.6;
            }
            .header {
                font-size: 1.8em;
                font-weight: bold;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--vscode-textLink-foreground);
                color: var(--vscode-textLink-foreground);
            }
            .class-description {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 20px;
                border-radius: 6px;
                margin-bottom: 25px;
                border-left: 4px solid var(--vscode-textLink-foreground);
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-weight: bold;
                font-size: 1.3em;
                margin-bottom: 15px;
                color: var(--vscode-textLink-foreground);
            }
            .subsection {
                margin-bottom: 20px;
                padding-left: 15px;
            }
            .subsection-title {
                font-weight: bold;
                font-size: 1.1em;
                margin-bottom: 10px;
                color: var(--vscode-textLink-foreground);
            }
            .code-block {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 15px;
                border-radius: 4px;
                font-family: var(--vscode-editor-font-family);
                margin: 10px 0;
                border-left: 3px solid var(--vscode-textLink-foreground);
                overflow-x: auto;
            }
            .code-block pre {
                margin: 0;
                padding: 0;
                background: none;
                border: none;
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            .code-block code {
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
                background: none;
                padding: 0;
                border: none;
            }
            .attribute-item, .method-item {
                margin-bottom: 12px;
                padding: 10px;
                background-color: var(--vscode-editor-lineHighlightBackground);
                border-radius: 4px;
            }
            .attribute-name, .method-name {
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .parameter-section {
                margin-bottom: 20px;
            }
            .parameter-item {
                margin-bottom: 15px;
                padding: 12px;
                background-color: var(--vscode-inputValidation-infoBackground);
                border-radius: 4px;
                border-left: 3px solid var(--vscode-inputValidation-infoBorder);
            }
            .parameter-name {
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
            }
            .parameter-type {
                font-style: italic;
                color: var(--vscode-descriptionForeground);
            }
        </style>
    </head>
    <body>
        <div class="header">Workflow Class Documentation</div>
        
        <div class="class-description">
            <p>The <strong>nova-act</strong> SDK provides convenience wrappers for managing workflows deployed with the NovaAct AWS service. The core type driving workflow coordination is <strong>Workflow</strong>, which provides a context manager that handles calling CreateWorkflowRun when your run starts and UpdateWorkflowRun with the appropriate status when it finishes.</p>
        </div>

        <div class="section">
            <div class="section-title">The Context Manager</div>
            <div class="code-block">
                <pre><code>from nova_act import NovaAct, Workflow


with Workflow(
    boto_session_kwargs={"region_name": "us-east-1"},
    workflow_definition_name="your-workflow-definition-name",
    model_id="nova-act-latest",
) as workflow:
    with NovaAct(
        starting_page="your-starting-url",
        workflow=workflow,
    ) as nova:
        result = nova.act("your-prompt")
        print(f"Task completed: \n{result.metadata}")</code></pre>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Key Parameters</div>
            <div class="parameter-item">
                <span class="parameter-name">workflow_definition_name:</span> <span class="parameter-type">str</span><br>
                Name identifier for the workflow definition
            </div>
            <div class="parameter-item">
                <span class="parameter-name">model_id:</span> <span class="parameter-type">str, optional</span><br>
                AI model identifier for workflow execution
            </div>
            <div class="parameter-item">
                <span class="parameter-name">boto_session_kwargs:</span> <span class="parameter-type">dict, optional</span><br>
                Optional dictionary of keyword arguments to pass to boto3.Session. Defaults to {'region_name': 'us-east-1'}. Credentials are automatically discovered from environment, IAM roles, or AWS config.
            </div>
        </div>

        <div class="section">
            <div class="section-title">The Decorator</div>
            <p>For convenience, the SDK also exposes a decorator which can be used to annotate functions to be run under a given workflow. The decorator leverages ContextVars to inject the correct Workflow object into each NovaAct instance within the function; no need to provide the workflow keyword argument!</p>
            <div class="code-block">
                <pre><code>from nova_act import NovaAct, workflow


@workflow(boto_session_kwargs={"region_name": "us-east-1"}, workflow_definition_name="your-workflow-definition-name", model_id="nova-act-latest")
def my_workflow(prompt):
    with NovaAct(starting_page="your-starting-url") as nova:
        result = nova.act(prompt)
        print(f"Task completed: \n{result.metadata}")


if __name__ == '__main__':
    my_workflow("your-prompt")</code></pre>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Best Practices</div>
            
            <div class="subsection">
                <div class="subsection-title">Multi-threading</div>
                <p>The Workflow class works as-is for multi-threaded workflows:</p>
                <div class="code-block">
                    <pre><code>from nova_act import NovaAct, Workflow
from threading import Thread


def multi_threaded_helper(workflow: Workflow):
    with NovaAct(..., workflow=workflow) as nova:
       # nova will have the appropriate workflow run
 

with Workflow(
    boto_session_kwargs=boto_session_kwargs, 
    workflow_definition_name="my-workflow", 
    model_id="nova-act-latest"
) as workflow:
    t = Thread(target=multi_threaded_helper, args=(workflow,))
    t.start()
    t.join()</code></pre>
                </div>
                
                <p>When using the @workflow decorator with multi-threading, you must provide context to functions running in different threads. You can either use copy_context():</p>
                <div class="code-block">
                    <pre><code>from contextvars import copy_context
from nova_act import NovaAct, workflow
from threading import Thread


def multi_threaded_helper():
    with NovaAct(...) as nova:
       # nova will have the appropriate workflow run
 

@workflow(boto_session_kwargs=boto_session_kwargs, workflow_definition_name="my-workflow", model_id="nova-act-latest")
def multi_threaded_workflow():
    ctx = copy_context()
    t = Thread(target=ctx.run, args=(multi_threaded_helper,))
    t.start()
    t.join()


multi_threaded_workflow()</code></pre>
                </div>
                
                <p>Or manually inject the workflow using get_current_workflow():</p>
                <div class="code-block">
                    <pre><code>from nova_act import NovaAct, get_current_workflow, workflow
from threading import Thread


def multi_threaded_helper(workflow: Workflow):
    with NovaAct(..., workflow=workflow) as nova:
       # nova will have the appropriate workflow run
 

@workflow(boto_session_kwargs=boto_session_kwargs, workflow_definition_name="my-workflow", model_id="nova-act-latest")
def multi_threaded_workflow():
    t = Thread(target=multi_threaded_helper, args=(get_current_workflow(),))
    t.start()
    t.join()


multi_threaded_workflow()</code></pre>
                </div>
            </div>
            
            <div class="subsection">
                <div class="subsection-title">Multi-processing</div>
                <p>The Workflow construct does not currently support passing between multi-processing because it maintains a boto3 Session and Client as instance variables, and those objects are not pickle-able. Support coming soon!</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Nova Act CLI</div>
            <p>The Nova Act CLI provides a streamlined command-line interface for deploying Python workflows to AWS AgentCore Runtime, handling containerization, ECR management, IAM roles, and multi-region deployments automatically.</p>
            
            <p><strong>How the Extension Uses the CLI:</strong></p>
            <ul>
                <li>The extension invokes the CLI under the hood for all deployment and execution operations</li>
                <li>CLI state is stored in <code>~/.act_cli/state/{account_id}-{region}.json</code> for each account/region</li>
                <li>Workflows deployed via extension are accessible via CLI and vice versa</li>
            </ul>
            
            <p><strong>When to Use CLI Directly:</strong></p>
            <ul>
                <li><strong>Multi-region deployments:</strong> Extension is locked to us-east-1; CLI supports all regions</li>
                <li><strong>Advanced options:</strong> Custom entry points, build directories, ECR repositories, S3 buckets</li>
                <li><strong>Workflow management:</strong> View details, update, delete workflows</li>
                <li><strong>Debugging:</strong> Preserve build artifacts, skip validation, inspect state</li>
            </ul>
            
            <p>Example CLI usage for multi-region deployment:</p>
            <div class="code-block">
                <pre><code>act workflow deploy --name my-workflow --source-dir /path/to/code --region us-west-2</code></pre>
            </div>
            
            <p>For more information, see the Nova Act CLI documentation in the SDK package.</p>
        </div>
    </body>
    </html>`;
}

/**
 * Generate IAM permissions documentation HTML
 */
function getIamPermissionsHtml(): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Required IAM Permissions</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                line-height: 1.6;
            }
            .header {
                font-size: 1.8em;
                font-weight: bold;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--vscode-textLink-foreground);
                color: var(--vscode-textLink-foreground);
            }
            .summary-box {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 20px;
                border-radius: 6px;
                margin-bottom: 25px;
                border-left: 4px solid var(--vscode-textLink-foreground);
            }
            .section {
                margin-bottom: 30px;
            }
            .section-title {
                font-weight: bold;
                font-size: 1.3em;
                margin-bottom: 15px;
                color: var(--vscode-textLink-foreground);
            }
            .code-block {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 15px;
                border-radius: 4px;
                font-family: var(--vscode-editor-font-family);
                margin: 10px 0;
                border-left: 3px solid var(--vscode-textLink-foreground);
                overflow-x: auto;
            }
            .code-block pre {
                margin: 0;
                padding: 0;
                background: none;
                border: none;
                font-family: var(--vscode-editor-font-family);
                font-size: 0.85em;
                white-space: pre;
                overflow-x: auto;
            }
            ul {
                margin: 10px 0;
                padding-left: 25px;
            }
            li {
                margin-bottom: 8px;
            }
            .warning-box {
                background-color: var(--vscode-inputValidation-warningBackground);
                padding: 15px;
                border-radius: 4px;
                margin: 15px 0;
                border-left: 4px solid var(--vscode-inputValidation-warningBorder);
            }
        </style>
    </head>
    <body>
        <div class="header">Required IAM Permissions for Nova Act Workflow Deployment</div>
        
        <div class="summary-box">
            <p><strong>The Nova Act Workflow CLI requires permissions across 9 AWS services:</strong></p>
            <ul>
                <li><strong>STS</strong> - Identity verification</li>
                <li><strong>IAM</strong> - Role management for workflow execution</li>
                <li><strong>ECR</strong> - Container image storage</li>
                <li><strong>S3</strong> - Workflow artifact storage</li>
                <li><strong>Bedrock AgentCore</strong> - Workflow runtime execution</li>
                <li><strong>Nova Act</strong> - Workflow definition management</li>
                <li><strong>CloudWatch Logs</strong> - Log streaming and monitoring</li>
                <li><strong>X-Ray</strong> - Distributed tracing</li>
                <li><strong>CloudWatch</strong> - Metrics publishing</li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">Complete IAM Policy</div>
            <p>Copy and paste this policy to enable all CLI capabilities:</p>
            <div class="code-block">
                <pre>{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "STSIdentityVerification",
      "Effect": "Allow",
      "Action": ["sts:GetCallerIdentity"],
      "Resource": "*"
    },
    {
      "Sid": "IAMRoleManagement",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:AttachRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/nova-act-*"
    },
    {
      "Sid": "ECRRepositoryManagement",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:DescribeRepositories",
        "ecr:CreateRepository"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECRImageOperations",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "arn:aws:ecr:*:*:repository/*"
    },
    {
      "Sid": "S3BucketManagement",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:HeadBucket",
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:PutBucketPublicAccessBlock",
        "s3:GetBucketPublicAccessBlock",
        "s3:PutBucketEncryption",
        "s3:GetBucketEncryption",
        "s3:PutBucketVersioning",
        "s3:GetBucketVersioning",
        "s3:ListAllMyBuckets"
      ],
      "Resource": ["arn:aws:s3:::nova-act-*"]
    },
    {
      "Sid": "S3ObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": ["arn:aws:s3:::nova-act-*/*"]
    },
    {
      "Sid": "BedrockAgentCoreControl",
      "Effect": "Allow",
      "Action": [
        "bedrock-agentcore:CreateAgentRuntime",
        "bedrock-agentcore:UpdateAgentRuntime",
        "bedrock-agentcore:ListAgentRuntimes"
      ],
      "Resource": "*"
    },
    {
      "Sid": "BedrockAgentCoreData",
      "Effect": "Allow",
      "Action": ["bedrock-agentcore:InvokeAgentRuntime"],
      "Resource": "*"
    },
    {
      "Sid": "NovaActWorkflowDefinitions",
      "Effect": "Allow",
      "Action": [
        "nova-act:CreateWorkflowDefinition",
        "nova-act:GetWorkflowDefinition",
        "nova-act:DeleteWorkflowDefinition"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchLogsStreaming",
      "Effect": "Allow",
      "Action": [
        "logs:StartLiveTail",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    }
  ]
}</pre>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Permission Explanations</div>
            <p>Understanding what each permission group does:</p>
            
            <p><strong>STS (Identity Verification):</strong></p>
            <ul>
                <li><code>sts:GetCallerIdentity</code> - Verifies your AWS account ID and region for state management</li>
            </ul>
            
            <p><strong>IAM (Role Management):</strong></p>
            <ul>
                <li><code>iam:CreateRole</code>, <code>iam:AttachRolePolicy</code> - Creates execution role for your workflow</li>
                <li><code>iam:GetRole</code>, <code>iam:PassRole</code> - Validates and assigns role to AgentCore Runtime</li>
                <li>Required for deployment only; skip if using <code>--execution-role-arn</code></li>
            </ul>
            
            <p><strong>ECR (Container Storage):</strong></p>
            <ul>
                <li><code>ecr:CreateRepository</code> - Creates repository for workflow container images</li>
                <li><code>ecr:PutImage</code>, <code>ecr:InitiateLayerUpload</code> - Pushes built container to ECR</li>
                <li><code>ecr:GetAuthorizationToken</code> - Authenticates Docker client with ECR</li>
                <li>Required for deployment only</li>
            </ul>
            
            <p><strong>S3 (Artifact Storage):</strong></p>
            <ul>
                <li><code>s3:CreateBucket</code> - Creates bucket for workflow artifacts (auto-created as <code>nova-act-{account-id}-{region}</code>)</li>
                <li><code>s3:PutObject</code>, <code>s3:GetObject</code> - Stores and retrieves workflow definitions</li>
                <li><code>s3:PutBucketPublicAccessBlock</code>, <code>s3:PutBucketEncryption</code> - Applies security configurations</li>
                <li>Required for deployment only</li>
            </ul>
            
            <p><strong>Bedrock AgentCore (Runtime Execution):</strong></p>
            <ul>
                <li><code>bedrock-agentcore:CreateAgentRuntime</code> - Creates container-based runtime for workflow</li>
                <li><code>bedrock-agentcore:InvokeAgentRuntime</code> - Executes workflow with provided payload</li>
                <li>Create/Update required for deployment; Invoke required for execution</li>
            </ul>
            
            <p><strong>Nova Act (Workflow Definitions):</strong></p>
            <ul>
                <li><code>nova-act:CreateWorkflowDefinition</code> - Creates workflow definition resource</li>
                <li><code>nova-act:GetWorkflowDefinition</code> - Retrieves workflow configuration</li>
                <li>Required for deployment only</li>
            </ul>
            
            <p><strong>CloudWatch Logs (Monitoring):</strong></p>
            <ul>
                <li><code>logs:StartLiveTail</code> - Streams real-time logs during execution</li>
                <li><code>logs:DescribeLogGroups</code>, <code>logs:DescribeLogStreams</code> - Discovers log locations</li>
                <li>Required for execution with log streaming; optional if running without <code>--tail-logs</code></li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">Minimal Policy (Run Only)</div>
            <p>If you only need to run existing workflows without deployment:</p>
            <div class="code-block">
                <pre>{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MinimalWorkflowExecution",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "bedrock-agentcore:InvokeAgentRuntime",
        "logs:StartLiveTail",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    }
  ]
}</pre>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Resource Naming Conventions</div>
            <p>The CLI uses consistent naming patterns for AWS resources:</p>
            <ul>
                <li><strong>IAM Roles:</strong> <code>nova-act-{workflow-name}-role</code></li>
                <li><strong>ECR Repository:</strong> <code>nova-act-workflows</code></li>
                <li><strong>S3 Buckets:</strong> <code>nova-act-{account-id}-{region}</code></li>
                <li><strong>CloudWatch Log Groups:</strong> <code>/aws/bedrock-agentcore/{agent-id}-{endpoint}</code></li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">Common Permission Errors</div>
            <div class="warning-box">
                <p><strong>AccessDenied on CreateRole:</strong></p>
                <p>Either add <code>iam:CreateRole</code> permission, or provide an existing role with <code>--execution-role-arn</code></p>
            </div>
            <div class="warning-box">
                <p><strong>AccessDenied on ECR Operations:</strong></p>
                <p>Add ECR permissions from the complete policy above</p>
            </div>
            <div class="warning-box">
                <p><strong>AccessDenied on StartLiveTail:</strong></p>
                <p>Add CloudWatch Logs permissions, or run without <code>--tail-logs</code> flag</p>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Security Best Practices</div>
            <ul>
                <li>Start with minimal permissions and add as needed</li>
                <li>Use resource-level restrictions where possible (e.g., <code>nova-act-*</code> patterns)</li>
                <li>The CLI automatically applies security configurations to created S3 buckets (block public access, encryption, versioning)</li>
                <li>Auto-created IAM roles trust only <code>bedrock-agentcore.amazonaws.com</code></li>
            </ul>
        </div>
    </body>
    </html>`;
}

/**
 * Generate deployment documentation HTML
 */
function getDeploymentDocumentationHtml(): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>How Deployment Works</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                line-height: 1.6;
            }
            .header {
                font-size: 1.8em;
                font-weight: bold;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--vscode-textLink-foreground);
                color: var(--vscode-textLink-foreground);
            }
            .section {
                margin-bottom: 30px;
            }
            .section-title {
                font-weight: bold;
                font-size: 1.3em;
                margin-bottom: 15px;
                color: var(--vscode-textLink-foreground);
            }
            code {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
            }
            .code-block {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 15px;
                border-radius: 4px;
                font-family: var(--vscode-editor-font-family);
                margin: 10px 0;
                border-left: 3px solid var(--vscode-textLink-foreground);
                overflow-x: auto;
            }
            .code-block pre {
                margin: 0;
                padding: 0;
                background: none;
                border: none;
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            .code-block code {
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
                background: none;
                padding: 0;
                border: none;
            }
            ul, ol {
                margin: 10px 0;
                padding-left: 25px;
            }
            li {
                margin-bottom: 8px;
            }
            strong {
                color: var(--vscode-textLink-foreground);
            }
        </style>
    </head>
    <body>
        <div class="header">How Deployment Works</div>
        
        <div class="section">
            <div class="section-title">Overview</div>
            <p>
                Nova Act CLI provides a streamlined workflow for deploying Python scripts to AWS AgentCore
                Runtime. It handles containerization, ECR management, IAM roles, and multi-region
                deployments automatically.
            </p>
        </div>

        <div class="section">
            <div class="section-title">Deployment Process</div>
            <p>When you deploy a workflow, the following steps occur automatically:</p>
            <ol>
                <li>
                    <strong>Entry Point Detection:</strong> The CLI identifies your workflow's entry point
                    (main.py or single .py file)
                </li>
                <li>
                    <strong>Containerization:</strong> Your code is packaged into a Docker container with all
                    dependencies
                </li>
                <li>
                    <strong>ECR Upload:</strong> The container image is pushed to Amazon Elastic Container
                    Registry (ECR)
                </li>
                <li>
                    <strong>IAM Role Creation:</strong> An execution role is created with required permissions
                    (or you can provide an existing role)
                </li>
                <li>
                    <strong>AgentCore Runtime:</strong> A container-based runtime is created in AWS Bedrock
                    AgentCore
                </li>
                <li>
                    <strong>Workflow Definition:</strong> A Nova Act WorkflowDefinition resource is created to
                    manage your workflow
                </li>
            </ol>
        </div>

        <div class="section">
            <div class="section-title">Entry Point Requirements</div>
            <p>Your workflow must have a valid entry point with the following requirements:</p>
            <ul>
                <li>Must be a <code>.py</code> file</li>
                <li>Must contain a <code>def main(payload):</code> function with at least one parameter</li>
                <li>The CLI automatically detects <code>main.py</code> or a single Python file in your directory</li>
                <li>You can explicitly specify an entry point with <code>--entry-point filename.py</code></li>
            </ul>
            <p><strong>Entry Point Validation:</strong></p>
            <p>The CLI validates that your entry point contains the required <code>main(payload)</code> function. Example:</p>
            <div class="code-block">
                <pre><code>def main(payload):
    # Your workflow logic here
    print(f"Received payload: {payload}")
    return {"status": "success"}</code></pre>
            </div>
            <p><strong>Skip Validation:</strong> For non-standard workflows (dynamic loading, custom signatures), use the CLI directly with <code>--skip-entrypoint-validation</code></p>
        </div>

        <div class="section">
            <div class="section-title">Build Process</div>
            <p>During deployment, the CLI builds a Docker container with your code and dependencies:</p>
            <ul>
                <li><strong>Build Location:</strong> Artifacts are created in your system's temp directory by default</li>
                <li><strong>Custom Build Directory:</strong> Use CLI with <code>--build-dir /path/to/dir</code> to preserve artifacts for debugging</li>
                <li><strong>Containerization:</strong> Your code is packaged with a Python runtime and all dependencies from requirements.txt</li>
                <li><strong>Image Storage:</strong> Built images are pushed to ECR repository <code>nova-act-cli-default</code></li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">State Management</div>
            <p>The CLI maintains deployment state in <code>~/.act_cli/state/{account_id}-{region}.json</code></p>
            <p><strong>What's Stored:</strong></p>
            <ul>
                <li>Workflow configurations (name, source directory, entry point)</li>
                <li>Deployment metadata (AgentCore ARN, image URI, status)</li>
                <li>Timestamps (created_at, updated_at)</li>
            </ul>
            <p><strong>State Isolation:</strong> Each AWS account and region combination has separate state files for safe multi-account/region deployments.</p>
            <p><strong>Troubleshooting:</strong> Inspect state files when workflows appear in unexpected states or to verify deployment details.</p>
        </div>

        <div class="section">
            <div class="section-title">IAM Role Management</div>
            <p>
                <strong>Auto-Creation (Default):</strong> The CLI automatically creates an IAM role named 
                <code>nova-act-{workflow-name}-role</code> with permissions for:
            </p>
            <ul>
                <li>Bedrock AgentCore operations</li>
                <li>ECR image access</li>
                <li>CloudWatch Logs</li>
                <li>X-Ray tracing</li>
                <li>S3 access (nova-act-* buckets)</li>
            </ul>
            <p>
                <strong>Use Existing Role:</strong> You can provide an existing IAM role ARN in the
                Execution Role ARN field to skip auto-creation.
            </p>
        </div>

        <div class="section">
            <div class="section-title">AWS Resources Created</div>
            <p>The deployment process creates the following AWS resources:</p>
            <ul>
                <li><strong>ECR Repository:</strong> <code>nova-act-cli-default</code> (stores container images)</li>
                <li><strong>IAM Role:</strong> <code>nova-act-{workflow-name}-role</code> (execution permissions)</li>
                <li><strong>AgentCore Runtime:</strong> Container-based runtime for workflow execution</li>
                <li><strong>WorkflowDefinition:</strong> Nova Act workflow definition resource</li>
                <li><strong>S3 Bucket:</strong> <code>nova-act-{account-id}-{region}</code> (artifact storage)</li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">Advanced Deployment Options</div>
            <p>The extension exposes basic deployment options. For advanced scenarios, use the CLI directly:</p>
            <ul>
                <li><code>--entry-point</code> - Specify custom entry point file</li>
                <li><code>--build-dir</code> - Custom build directory for artifact preservation</li>
                <li><code>--ecr-repo</code> - Use custom ECR repository</li>
                <li><code>--s3-bucket-name</code> - Use custom S3 bucket for artifacts</li>
                <li><code>--skip-entrypoint-validation</code> - Bypass entry point validation</li>
                <li><code>--no-build</code> - Skip building (use existing image)</li>
                <li><code>--region</code> - Deploy to regions other than us-east-1</li>
            </ul>
            <p>Example CLI usage:</p>
            <div class="code-block">
                <pre><code>act workflow deploy --name my-workflow --source-dir /path/to/code --build-dir /tmp/debug-build --region us-west-2</code></pre>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Troubleshooting Common Errors</div>
            <p><strong>Entry Point Validation Failed:</strong></p>
            <ul>
                <li>Ensure your entry point file contains <code>def main(payload):</code></li>
                <li>Use <code>--skip-entrypoint-validation</code> for non-standard patterns</li>
            </ul>
            <p><strong>Docker Not Running:</strong></p>
            <ul>
                <li>Start Docker Desktop or Docker daemon</li>
                <li>Verify with <code>docker --version</code></li>
            </ul>
            <p><strong>AWS Credential Issues:</strong></p>
            <ul>
                <li>Verify credentials with <code>aws sts get-caller-identity</code></li>
                <li>Check AWS profile configuration in <code>~/.aws/credentials</code></li>
            </ul>
            <p><strong>Permission Errors:</strong></p>
            <ul>
                <li>Review required IAM permissions (View Permissions link)</li>
                <li>Use <code>--execution-role-arn</code> if you cannot create IAM roles</li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">Configuring CLI Path</div>
            <p>
                If you need to use a custom Nova Act CLI installation, you can configure the CLI path in VS
                Code settings:
            </p>
            <ol>
                <li>Open VS Code Settings (File → Preferences → Settings or <code>Cmd+,</code> on Mac)</li>
                <li>Search for <code>Nova Act CLI Path</code></li>
                <li>Set the <code>novaAct.cliPath</code> setting to your custom CLI path (e.g., <code>/usr/local/bin/act</code>)</li>
            </ol>
            <p>
                If not configured, the extension uses the <code>act</code> command from your system PATH.
            </p>
        </div>
    </body>
    </html>`;
}

/**
 * Generate Run documentation HTML
 */
function getRunDocumentationHtml(): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>How the Run Tab Works</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
                padding: 20px;
                line-height: 1.6;
            }
            .header {
                font-size: 1.8em;
                font-weight: bold;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--vscode-textLink-foreground);
                color: var(--vscode-textLink-foreground);
            }
            .summary-box {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 20px;
                border-radius: 6px;
                margin-bottom: 25px;
                border-left: 4px solid var(--vscode-textLink-foreground);
            }
            .section {
                margin-bottom: 30px;
            }
            .section-title {
                font-weight: bold;
                font-size: 1.3em;
                margin-bottom: 15px;
                color: var(--vscode-textLink-foreground);
            }
            ol {
                margin: 10px 0;
                padding-left: 30px;
            }
            li {
                margin-bottom: 12px;
            }
            strong {
                color: var(--vscode-textLink-foreground);
            }
            code {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
            }
            .code-block {
                background-color: var(--vscode-textCodeBlock-background);
                padding: 15px;
                border-radius: 4px;
                font-family: var(--vscode-editor-font-family);
                margin: 10px 0;
                border-left: 3px solid var(--vscode-textLink-foreground);
                overflow-x: auto;
            }
            .code-block pre {
                margin: 0;
                padding: 0;
                background: none;
                border: none;
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            .code-block code {
                font-family: var(--vscode-editor-font-family);
                font-size: 0.9em;
                background: none;
                padding: 0;
                border: none;
            }
            ul {
                margin: 10px 0;
                padding-left: 25px;
            }
        </style>
    </head>
    <body>
        <div class="header">How the Run Tab Works</div>
        
        <div class="summary-box">
            <p>
                The Run tab uses the Nova Act CLI to discover and execute your workflows deployed to AgentCore.
            </p>
        </div>

        <div class="section">
            <div class="section-title">Workflow Discovery</div>
            <p>
                The extension retrieves the list of available workflows and their associated AgentCore Runtime 
                instances from the Act CLI. Each workflow is linked to a specific runtime that will execute 
                your workflow code.
            </p>
        </div>

        <div class="section">
            <div class="section-title">Execution Flow</div>
            <ol>
                <li>
                    <strong>Select Workflow:</strong> Choose a workflow from the list to view its details 
                    and prepare for execution.
                </li>
                <li>
                    <strong>Configure Payload:</strong> Provide the JSON input payload that will be passed 
                    to your workflow.
                </li>
                <li>
                    <strong>Invoke:</strong> The extension sends your payload to the AgentCore Runtime 
                    using the Act CLI.
                </li>
                <li>
                    <strong>View Results:</strong> Execution status and output are displayed in real-time.
                </li>
            </ol>
        </div>

        <div class="section">
            <div class="section-title">Runtime Configuration (AC_HANDLER_ENV)</div>
            <p>Pass environment variables to your workflow at runtime without redeployment using the <code>AC_HANDLER_ENV</code> field in your payload:</p>
            <div class="code-block">
                <pre><code>{
  "AC_HANDLER_ENV": {
    "API_KEY": "your-api-key",
    "DEBUG_MODE": "true",
    "CUSTOM_CONFIG": "value"
  },
  "input": "your workflow data"
}</code></pre>
            </div>
            <p><strong>Accessing Variables in Your Workflow:</strong></p>
            <div class="code-block">
                <pre><code>import os

def main(payload):
    api_key = os.environ.get('API_KEY')
    debug_mode = os.environ.get('DEBUG_MODE', 'false')
    
    # Use environment variables in your workflow
    print(f"Debug mode: {debug_mode}")</code></pre>
            </div>
            <p><strong>Benefits:</strong></p>
            <ul>
                <li>Change configuration without redeploying</li>
                <li>Pass different credentials per execution</li>
                <li>Test with different settings instantly</li>
                <li>Manage secrets separately from code</li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">Log Streaming & Monitoring</div>
            <p><strong>Real-time Logs:</strong> The CLI streams logs during execution using the <code>--tail-logs</code> flag (enabled by default in the extension).</p>
            <p><strong>CloudWatch Log Groups:</strong> Workflow execution logs are stored in:</p>
            <div class="code-block">
                <pre><code>/aws/bedrock/agentcore/{agent-id}</code></pre>
            </div>
            <p><strong>Log Types:</strong></p>
            <ul>
                <li><strong>Application Logs:</strong> Your workflow's print statements and logging output</li>
                <li><strong>OTEL Logs:</strong> OpenTelemetry tracing and observability data</li>
            </ul>
            <p><strong>Accessing Historical Logs:</strong> View past execution logs in the AWS CloudWatch console or use the AWS CLI:</p>
            <div class="code-block">
                <pre><code>aws logs tail /aws/bedrock/agentcore/{agent-id} --follow</code></pre>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Workflow Management Commands</div>
            <p>The extension provides basic workflow execution. For advanced management, use the CLI directly:</p>
            <ul>
                <li><code>act workflow show --name my-workflow</code> - View workflow details and deployment status</li>
                <li><code>act workflow update --name my-workflow --source-dir /path/to/code</code> - Update existing workflow</li>
                <li><code>act workflow delete --name my-workflow</code> - Delete workflow and associated resources</li>
                <li><code>act workflow list</code> - List all workflows in current account/region</li>
            </ul>
            <p>Example viewing workflow details:</p>
            <div class="code-block">
                <pre><code>act workflow show --name my-workflow
# Displays: AgentCore ARN, image URI, status, timestamps</code></pre>
            </div>
        </div>
    </body>
    </html>`;
}
