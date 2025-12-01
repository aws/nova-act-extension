import { useCallback, useEffect, useState } from 'react';

import { DEPLOY_TAB_CONFIG } from '../../../../core/config/deployTabConfig';
import { useCells } from '../../../../core/context/CellsContext';
import { useFile } from '../../../../core/context/FileContext';
import { useInitialTab } from '../../../../core/context/InitialTabContext';
import { templates } from '../../../../core/templates/templates';
// eslint-disable-next-line import/order
import type { DeployResultMessage, ProgressMessage } from '../../../../core/types/deployTypes';
import { TAB_NAMES } from '../../../../core/types/sidebarMessages';
import { convertToDeploymentFormat } from '../../../../core/utils/codeTransformation';
import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';
import { getScriptContent } from '../../../../core/utils/workflowUtils';
import { ConfirmationModal } from '../../NotebookPanel/ConfirmationModal';
import { DeployInstructions } from '../DeployInstructions';
import { DeploymentSection } from '../DeploymentSection';

const sendDeployCommand = (
  name: string,
  region: string,
  filePath: string,
  executionRoleArn?: string
): void => {
  builderModeVscodeApi?.postMessage({
    command: 'deployScript',
    name,
    region,
    filePath,
    ...(executionRoleArn && { executionRoleArn }),
  });
};

export const DeploymentPage = () => {
  const { cells } = useCells();
  const { fileLocation, fileContent } = useFile();
  const { navigateToTab } = useInitialTab();

  const hasScriptLoaded = Boolean(fileLocation);

  // Deployment form state
  const [agentName, setAgentName] = useState('');
  const [region, setRegion] = useState(DEPLOY_TAB_CONFIG.defaultRegion);
  const [executionRoleArn, setExecutionRoleArn] = useState('');
  const [validationError, setValidationError] = useState('');
  const [executionRoleArnError, setExecutionRoleArnError] = useState('');
  const [workflowNameWarning, setWorkflowNameWarning] = useState('');
  const [headlessWarning, setHeadlessWarning] = useState('');
  const [deploymentFormatWarning, setDeploymentFormatWarning] = useState('');

  // Conversion state
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionDontRemind, setConversionDontRemind] = useState(false);

  // Deployment execution state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployOutput, setDeployOutput] = useState('');
  const [deployStatus, setDeployStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [deploymentStatusText, setDeploymentStatusText] = useState<string>('');

  // UI state

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.command === 'deployResult') {
        handleDeployResult(message);
      } else if (message.type === 'deployProgress') {
        handleDeployProgress(message);
      } else if (message.type === 'workflowScriptValidationResult') {
        handleValidationResult(message);
      } else if (message.type === 'conversionApplied') {
        handleConversionApplied(message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (agentName.trim() && fileLocation) {
      const timeoutId = setTimeout(() => {
        builderModeVscodeApi?.postMessage({
          command: 'validateWorkflowScript',
          filePath: fileLocation,
          agentName,
        });
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setWorkflowNameWarning('');
      setHeadlessWarning('');
      setDeploymentFormatWarning('');
    }
  }, [agentName, fileLocation]);

  const handleDeployResult = (message: DeployResultMessage) => {
    setIsDeploying(false);
    if (message.success) {
      updateDeploymentSuccess();
    } else {
      updateDeploymentError(message.error);
    }
  };

  const handleDeployProgress = (message: ProgressMessage) => {
    setDeployOutput((prev) => prev + message.output);
  };

  const handleValidationResult = (message: {
    success: boolean;
    workflowNameWarning: string;
    headlessWarning: string;
    deploymentFormatWarning: string;
    error?: string;
  }) => {
    if (message.success) {
      setWorkflowNameWarning(message.workflowNameWarning);
      setHeadlessWarning(message.headlessWarning);
      setDeploymentFormatWarning(message.deploymentFormatWarning);
    } else {
      setWorkflowNameWarning('');
      setHeadlessWarning('');
      setDeploymentFormatWarning('');
    }
  };

  const handleConversionApplied = (message: { success: boolean; error?: string }) => {
    if (message.success) {
      setShowConversionModal(false);
    }
  };

  const handleLoadAwsTemplate = useCallback((): void => {
    builderModeVscodeApi.postMessage({
      command: 'builderMode',
      template: templates['act-workflow'],
      initialTab: TAB_NAMES.BUILD,
    });

    navigateToTab(TAB_NAMES.BUILD);
  }, [navigateToTab]);

  const getDeploymentWarningMessage = (): string => {
    return deploymentFormatWarning;
  };

  const getWarningType = (): 'workflow-name' | 'deployment-format' | null => {
    if (workflowNameWarning) return 'workflow-name';
    if (headlessWarning || deploymentFormatWarning) return 'deployment-format';
    return null;
  };

  // Validation helpers

  const initializeDeploymentState = (): void => {
    setIsDeploying(true);
    setDeployOutput('');
    setDeployStatus('idle');
    setDeploymentStatusText('Starting deployment...');
  };

  const validateDeploymentForm = (): boolean => {
    if (!agentName.trim()) {
      setValidationError('Agent name is required');
      return false;
    }

    setValidationError('');
    return true;
  };

  const updateDeploymentSuccess = (): void => {
    setDeployStatus('success');
    setDeploymentStatusText('Agent Deployment Successful');
  };

  const updateDeploymentError = (error?: string): void => {
    setDeployOutput((prev) => prev + `\nDeployment error: ${error}`);
    setDeployStatus('error');
    setDeploymentStatusText('Agent Deployment Failed');
  };

  const handleAgentNameChange = (name: string): void => {
    setAgentName(name);
    if (validationError && name.trim()) {
      setValidationError('');
    }
  };

  const handleAgentNameBlur = (): void => {
    if (agentName.trim() && fileLocation) {
      builderModeVscodeApi?.postMessage({
        command: 'validateWorkflowScript',
        filePath: fileLocation,
        agentName,
      });
    }
  };

  const handleExecutionRoleArnChange = (arn: string): void => {
    setExecutionRoleArn(arn);
    if (executionRoleArnError && !arn.trim()) {
      setExecutionRoleArnError('');
    }
  };

  const handleExecutionRoleArnBlur = (): void => {
    if (!executionRoleArn.trim()) {
      setExecutionRoleArnError('');
      return;
    }

    const arnPattern = /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/;
    if (!arnPattern.test(executionRoleArn)) {
      setExecutionRoleArnError(
        'Invalid IAM role ARN format. Expected: arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME'
      );
    } else {
      setExecutionRoleArnError('');
    }
  };

  const executeDeployment = (): void => {
    if (!validateDeploymentForm()) return;

    if (executionRoleArnError) {
      return;
    }

    if (!fileLocation) {
      setDeployOutput('Error: No file location available for deployment.');
      setDeployStatus('error');
      return;
    }

    initializeDeploymentState();
    sendDeployCommand(agentName, region, fileLocation, executionRoleArn || undefined);
  };

  const handleShowConversionModal = () => {
    if (conversionDontRemind) {
      executeConversion();
    } else {
      setShowConversionModal(true);
    }
  };

  const executeConversion = () => {
    const scriptContent = getScriptContent(cells, fileContent);
    const result = convertToDeploymentFormat(scriptContent);

    if (!fileLocation) return;

    builderModeVscodeApi?.postMessage({
      command: 'applyConversion',
      filePath: fileLocation,
      convertedCode: result.code,
      agentName,
    });

    setShowConversionModal(false);
  };

  const handleConfirmConversion = () => {
    executeConversion();
  };

  const handleCancelConversion = () => {
    setShowConversionModal(false);
  };

  const isAgentNameValid = agentName.trim().length > 0;
  const deploymentWarningMessage = getDeploymentWarningMessage();

  // Construct props for extracted components
  const canDeploy = isAgentNameValid && hasScriptLoaded;
  const deployButtonTooltip = !hasScriptLoaded
    ? 'Please load a script in the control bar above before deploying'
    : !isAgentNameValid
      ? 'Please enter an agent name'
      : 'Deploy your workflow to AWS';

  const deploymentProps = {
    agentName,
    region,
    executionRoleArn,
    validationError,
    executionRoleArnError,
    workflowNameWarning: workflowNameWarning || headlessWarning || deploymentWarningMessage,
    warningType: getWarningType(),
    hasConversionAction: deploymentFormatWarning.length > 0,
    onConvert: handleShowConversionModal,
    isAgentNameValid,
    canDeploy,
    deployButtonTooltip,
    regions: DEPLOY_TAB_CONFIG.regions,
    onAgentNameChange: handleAgentNameChange,
    onAgentNameBlur: handleAgentNameBlur,
    onRegionChange: setRegion,
    onExecutionRoleArnChange: handleExecutionRoleArnChange,
    onExecutionRoleArnBlur: handleExecutionRoleArnBlur,
    onDeploy: executeDeployment,
    isDeploying,
    deployOutput,
    deployStatus,
    deploymentStatusText,
  };

  return (
    <div className="state-container spacing-loose">
      <div className="deploy-content-container">
        <DeployInstructions onLoadAwsTemplate={handleLoadAwsTemplate} />
        <DeploymentSection {...deploymentProps} />
        <ConfirmationModal
          isOpen={showConversionModal}
          dontRemind={conversionDontRemind}
          setDontRemind={setConversionDontRemind}
          onConfirm={handleConfirmConversion}
          onCancel={handleCancelConversion}
          confirmationText="This will automatically convert your code to AWS deployment format by wrapping it in a main(payload) function and ensuring headless=True is set. Do you want to proceed?"
        />
      </div>
    </div>
  );
};
