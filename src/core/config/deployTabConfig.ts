export interface DeploymentFormField {
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: 'text' | 'select';
  helpText?: string;
  validation?: (value: string) => { valid: boolean; error?: string };
}

export const EXECUTION_ROLE_ARN_FIELD: DeploymentFormField = {
  id: 'executionRoleArn',
  label: 'Execution Role ARN (Optional)',
  placeholder: 'arn:aws:iam::123456789012:role/MyWorkflowRole',
  required: false,
  type: 'text',
  helpText:
    'Specify an existing IAM role ARN if you cannot create roles automatically. Leave empty to auto-create a role.',
  validation: (value: string) => {
    if (!value) return { valid: true };

    const arnPattern = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/;
    if (!arnPattern.test(value)) {
      return {
        valid: false,
        error: 'Invalid IAM role ARN format. Expected: arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME',
      };
    }

    return { valid: true };
  },
};

export const AGENT_NAME_FIELD: DeploymentFormField = {
  id: 'agentName',
  label: 'AWS WorkflowDefinition Name',
  placeholder: 'Enter workflow name',
  required: true,
  type: 'text',
  helpText:
    'The unique name for your workflow definition. This must match the workflow definition name defined in your script. Use lowercase letters, numbers, and hyphens only.',
  validation: (value: string) => {
    if (!value) return { valid: false, error: 'Workflow name is required' };

    const namePattern = /^[a-z0-9_-]+$/;
    if (!namePattern.test(value)) {
      return {
        valid: false,
        error: 'Name must contain only lowercase letters, numbers, hyphens, and underscores',
      };
    }

    if (value.length < 3 || value.length > 64) {
      return {
        valid: false,
        error: 'Name must be between 3 and 64 characters',
      };
    }

    return { valid: true };
  },
};

export const REGION_FIELD: DeploymentFormField = {
  id: 'region',
  label: 'AWS Region',
  placeholder: 'Select region',
  required: true,
  type: 'select',
  helpText:
    'The AWS region where your workflow will be deployed. Currently only us-east-1 is supported.',
};

export const DEPLOY_TAB_CONFIG = {
  regions: [{ value: 'us-east-1', label: 'us-east-1' }],
  defaultRegion: 'us-east-1',
  messages: {
    errors: {
      noDeployName: 'Error: Please enter a deployment name',
      noScriptContent: 'Error: No script content to deploy',
      invalidJson: 'Error: Invalid JSON payload',
      noEndpointArn: 'Error: No endpoint ARN available',
    },
    status: {
      validating: 'Validating dependencies...',
      deploying: 'Dependencies validated. Starting deployment...',
      invoking: 'Invoking runtime...',
    },
    success: {
      arnCopied: 'Endpoint ARN copied to clipboard!',
    },
  },
  ui: {
    titles: {
      main: 'Deploy Script to AWS AgentCore',
      dependencyIssues: 'Dependency Issues:',
      deploymentOutput: 'Deployment Output:',
      deploymentSuccessful: 'Deployment Successful!',
      runtimeInvocation: 'Runtime Invocation',
      invocationResponse: 'Invocation Response:',
      deployHeading: 'Deploy your workflow to AWS AgentCore Runtime',
      prerequisites: 'Prerequisites',
      packageSection: 'Package Agent Image',
      finalSection: 'Deploy Workflow To AWS',
    },
    labels: {
      deploymentName: 'Deployment Name:',
      awsRegion: 'AWS Region:',
      endpointArn: 'Endpoint ARN:',
      payloadJson: 'Payload (JSON):',
      agentName: 'AWS WorkflowDefinition Name:',
      iamIdentity: 'IAM Identity:  ',
    },
    placeholders: {
      deploymentName: 'Enter deployment name',
      payloadJson: '{"key": "value"}',
      fileName: 'main.py',
    },
    buttons: {
      deploy: 'Deploy',
      deploying: 'Deploying...',
      validating: 'Validating...',
      copyArn: 'Copy ARN',
      invokeRuntime: 'Invoke Runtime',
      invoking: 'Invoking...',
      copy: 'Copy',
      copied: 'Copied!',
      next: 'Next',
      createAccount: 'Create AWS Account',
      packageDeploy: 'Deploy Your Workflow',
    },
    instructions: {
      initial:
        'To Deploy your Nova Act Agent you will need to configure your credentials for the AWS Command Line Interface. To do this follow the steps below.',
      introText:
        'The Deploy tab allows you to package your workflow script and deploy it to AWS AgentCore Runtime. Follow the prerequisites and steps below to prepare and deploy your workflow. Deployment on AWS is subject to your AWS customer terms.',
      prerequisites:
        'The only prerequisite is having valid and working AWS credentials configured, wether they are permanent access keys for an IAM user or a temporary assumed role. To begin you will need to install the AWS CLI by following the AWS installer getting started guide.',
      prerequisitesUpdated:
        'The only prerequisite is having valid and working credentials configured, wether they are permanent access keys for an IAM user or temporary assumed role credentials. To begin you will need to install the AWS CLI by following the AWS installer getting started guide.',
      postValidation:
        'Once you have configured your credentials to support the AWS CLI click next below:',
      deploy: 'To deploy your Nova Act workflow you will need to:',
      deploySteps: [
        'Make sure your workflow script is selected above',
        "Make sure that your script defines a 'workflow_definition_name' or '@workflow' tag",
        'Name your workflow and select an AWS region to deploy to',
        'Package and Deploy your image on AgentCore',
      ],
      packageFiles:
        'Select one (or more) files for your Agent Image package. Click the plus button to add multiple files to the Agent Image package.',
      finalStep: 'The last step is to package your image and deploy your workflow to AWS',
    },
    errors: {
      credentialValidation: 'You have not yet fully configured your AWS credentials.',
    },
    stepLabels: {
      configure: 'Next configure your credentials using:',
      credentialsFile: 'Your credential file is at the following location:',
      validate: 'To validate your credentials have been properly setup use the command',
    },
    commands: {
      configure: 'aws configure',
      credentials: '~/.aws/credentials',
      validate: 'aws sts get-caller-identity',
    },
    links: {
      awsInstaller: 'https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html',
      awsFree: 'https://aws.amazon.com/free',
    },
    newcomer: {
      title: 'New to AWS?',
    },
  },
  credentialSetup: {
    titles: {
      newcomer: 'New to AWS?',
      setup: 'AWS CLI Setup',
      commands: 'Setup Commands',
    },
    messages: {
      newcomerDescription: 'Get started with AWS credentials setup to deploy your scripts.',
      validationSuccess: 'AWS credentials validated successfully!',
      validationError: 'AWS credentials validation failed. Please check your setup.',
    },
    steps: [
      'Install AWS CLI',
      'Run aws configure command',
      'Enter your AWS credentials',
      'Validate your setup',
    ],
    commands: {
      install: 'pip install awscli',
      configure: 'aws configure',
      validate: 'aws sts get-caller-identity',
    },
    links: {
      awsSignup: 'https://aws.amazon.com/free',
      cliDocs: 'https://docs.aws.amazon.com/cli/',
    },
    buttons: {
      getStarted: 'Setup AWS Credentials',
      createAccount: 'Create AWS Account',
      validate: 'Validate Credentials',
      validating: 'Validating...',
    },
  },
};
