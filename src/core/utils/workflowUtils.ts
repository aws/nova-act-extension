// Frontend-safe workflow utilities (no Node.js dependencies)

interface Cell {
  code: string;
}

export const getScriptContent = (cells: Cell[], fileContent?: string): string => {
  if (cells.length > 0) {
    return cells.map((cell) => cell.code).join('\n\n');
  }
  return fileContent || '';
};

export const validateWorkflowNameInScript = (agentName: string, scriptContent: string): string => {
  if (!agentName.trim()) return '';
  if (!scriptContent.trim()) return '';

  const lowerContent = scriptContent.toLowerCase();
  const lowerAgentName = agentName.toLowerCase();

  const hasWorkflowDefinition = lowerContent.includes('workflow_definition_name');
  const hasWorkflowDecorator = lowerContent.includes('@workflow');
  const hasAgentName = lowerContent.includes(lowerAgentName);

  if (!hasWorkflowDefinition && !hasWorkflowDecorator && !hasAgentName) {
    return `Script content doesn't seem to reference workflow name. Consider adding 'workflow_definition_name' or '@workflow' decorator in your script.`;
  }

  return '';
};

export const validateHeadlessParameter = (scriptContent: string): string => {
  if (!scriptContent.trim()) return '';

  const novaActPattern = /novaact\s*\(/i;
  if (!novaActPattern.test(scriptContent)) {
    return '';
  }

  const headlessTruePattern = /headless\s*=\s*true/i;
  if (!headlessTruePattern.test(scriptContent.toLowerCase())) {
    return 'Script does not contain headless=True. AWS deployments require headless mode. Add headless=True to your NovaAct initialization.';
  }

  return '';
};

export const validateDeploymentFormat = (scriptContent: string): string => {
  if (!scriptContent.trim()) return '';

  const errors: string[] = [];

  const mainFunctionPattern = /def\s+main\s*\([^)]*\w[^)]*\)/;
  if (!mainFunctionPattern.test(scriptContent)) {
    errors.push('Missing required def main(payload) function for AWS deployment');
  }

  const novaActPattern = /novaact\s*\(/i;
  const headlessTruePattern = /headless\s*=\s*true/i;

  if (
    novaActPattern.test(scriptContent) &&
    !headlessTruePattern.test(scriptContent.toLowerCase())
  ) {
    errors.push('AWS deployments require headless=True in NovaAct initialization');
  }

  const mainNoParamPattern = /def\s+main\s*\(\s*\)/;
  if (mainNoParamPattern.test(scriptContent)) {
    errors.push('main() must accept a payload parameter');
  }

  return errors.length > 0 ? errors.join('. ') : '';
};
