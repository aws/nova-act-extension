export interface CodeChange {
  type: 'import_extracted' | 'wrapped_in_function' | 'converted_context_manager' | 'added_headless';
  description: string;
  lineNumber?: number;
}

export interface ConversionResult {
  success: boolean;
  code: string;
  warnings: string[];
  changes: CodeChange[];
}

export const convertToDeploymentFormat = (originalCode: string): ConversionResult => {
  const changes: CodeChange[] = [];
  const warnings: string[] = [];

  // Step 1: Check if already deployment-ready
  if (hasMainFunction(originalCode) && hasHeadlessTrue(originalCode)) {
    return {
      success: true,
      code: originalCode,
      warnings: ['Code is already deployment-ready'],
      changes: [],
    };
  }

  // Step 2: Extract imports
  const { imports, codeWithoutImports } = extractImports(originalCode);
  if (imports.length > 0) {
    changes.push({
      type: 'import_extracted',
      description: `Extracted ${imports.length} import statements to module level`,
    });
  }

  // Step 3: Wrap in main function
  const wrappedCode = wrapInMainFunction(codeWithoutImports);
  changes.push({
    type: 'wrapped_in_function',
    description: 'Wrapped code in def main(payload={}) function',
  });

  // Step 4: Ensure headless=True
  const finalCode = ensureHeadlessTrue(wrappedCode);
  if (finalCode !== wrappedCode) {
    changes.push({
      type: 'added_headless',
      description: 'Added headless=True parameter to NovaAct initialization',
    });
  }

  // Step 5: Combine
  const result = `${imports.join('\n')}\n\n${finalCode}\n\n# For local testing\nif __name__ == "__main__":\n    main()`;

  return {
    success: true,
    code: result,
    warnings,
    changes,
  };
};

const hasMainFunction = (code: string): boolean => {
  return /def\s+main\s*\([^)]*\w[^)]*\)/.test(code);
};

const hasHeadlessTrue = (code: string): boolean => {
  return /headless\s*=\s*true/i.test(code);
};

const extractImports = (code: string): { imports: string[]; codeWithoutImports: string } => {
  const lines = code.split('\n');
  const imports: string[] = [];
  const otherLines: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
      imports.push(line);
    } else {
      otherLines.push(line);
    }
  }

  return {
    imports,
    codeWithoutImports: otherLines.join('\n'),
  };
};

const wrapInMainFunction = (code: string): string => {
  const indentedCode = code
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : line))
    .join('\n');

  return `def main(payload={}):\n    """\n    AWS-deployable workflow.\n    This function is called by AWS AgentCore with runtime configuration.\n    """\n${indentedCode}`;
};

const ensureHeadlessTrue = (code: string): string => {
  const novaActPattern = /NovaAct\s*\([^)]*\)/g;

  return code.replace(novaActPattern, (match) => {
    if (/headless\s*=\s*true/i.test(match)) {
      return match;
    }

    // Add headless=True before closing paren
    return match.replace(/\)$/, ', headless=True)');
  });
};
