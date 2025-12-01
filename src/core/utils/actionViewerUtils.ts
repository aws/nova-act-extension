import * as fs from 'fs';
import * as path from 'path';

import { type ActionData, type ActionStep } from '../types/actionViewerMessages';

interface NewFormatMetadata {
  session_id?: string;
  act_id?: string;
  prompt?: string;
}

interface NewFormatRoot {
  steps: unknown[];
  metadata: NewFormatMetadata;
}

/**
 * Helper function to extract Session ID and Act ID from file path
 * Format: path/to/session/act_*.html
 */
export function extractSessionAndActIds(filePath: string): {
  sessionId: string | null;
  actId: string | null;
} {
  try {
    const pathParts = filePath.split(path.sep);
    const fileName = path.basename(filePath);

    // Find session ID (parent directory)
    let sessionId: string | null = null;
    if (pathParts.length >= 2) {
      sessionId = pathParts[pathParts.length - 2] || null;
    }

    // Extract Act ID from filename (act_*.html)
    let actId: string | null = null;
    const actMatch = fileName.match(/^act_([^_]+).*\.html$/i);
    if (actMatch && actMatch[1]) {
      actId = actMatch[1];
    }

    return { sessionId, actId };
  } catch (_error) {
    return { sessionId: null, actId: null };
  }
}

/**
 * Helper function to extract Session ID from folder path
 */
export function extractSessionIdFromFolder(folderPath: string): string | null {
  try {
    const pathParts = folderPath.split(path.sep);
    // Return the last directory name as session ID
    return pathParts[pathParts.length - 1] || null;
  } catch (_error) {
    return null;
  }
}

/**
 * Helper function to extract short Act ID for panel title
 */
export function extractShortActId(htmlContent: string): string {
  try {
    const actIdMatch = htmlContent.match(/<h3[^>]*>Act ID:\s*([^<]+)<\/h3>/i);
    const fullActId = actIdMatch?.[1]?.trim() || '';

    if (fullActId) {
      // For UUID format (like 3f645336-57ca-4634-a975-051e18944920), take last 4 chars
      if (fullActId.includes('-') && fullActId.length > 10) {
        const shortId = fullActId.slice(-4);
        return `act_${shortId}`;
      }

      // For other formats, take last 4 characters or the whole thing if shorter
      const shortId = fullActId.length > 4 ? fullActId.slice(-4) : fullActId;
      return `act_${shortId}`;
    }

    return 'Action Viewer';
  } catch (_error) {
    return 'Action Viewer';
  }
}

/**
 * Helper function to sort files by their creation timestamp
 */
export function sortFilesByTimestamp(filePaths: string[]): string[] {
  try {
    const filesWithTimestamps = filePaths.map((filePath: string) => {
      try {
        const fileStats: fs.Stats = fs.statSync(filePath);
        const creationTime: number = fileStats.birthtime.getTime();
        return { filePath, timestamp: creationTime };
      } catch (_error) {
        return { filePath, timestamp: Date.now() };
      }
    });

    filesWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);
    return filesWithTimestamps.map((item) => item.filePath);
  } catch (_error) {
    return filePaths;
  }
}

/**
 * Helper function to detect calls JSON format
 */
function isNewFormat(jsonData: unknown): jsonData is NewFormatRoot {
  if (typeof jsonData !== 'object' || jsonData === null) {
    return false;
  }
  const obj = jsonData as Record<string, unknown>;
  return Array.isArray(obj.steps) && typeof obj.metadata === 'object' && obj.metadata !== null;
}

/**
 * Helper function to create an ActionStep from a call object
 */
export function createActionStep(
  call: Record<string, unknown>,
  index: number,
  actId: string,
  fileName: string,
  includeFileInfo: boolean
): ActionStep {
  const callObj: Record<string, unknown> = call as Record<string, unknown>;
  const requestObj: Record<string, unknown> = callObj.request as Record<string, unknown>;
  const responseObj: Record<string, unknown> = callObj.response as Record<string, unknown>;
  const metadata: Record<string, unknown> = (requestObj?.metadata as Record<string, unknown>) || {};

  const timestamp: string = metadata.timestamp_ms
    ? new Date(metadata.timestamp_ms as number).toISOString()
    : new Date().toISOString();

  const step: ActionStep = {
    stepNumber: index + 1,
    currentUrl: (metadata.activeURL as string) || 'No URL available',
    timestamp,
    imageData: (requestObj?.screenshot as string) || undefined,
    actionData: (responseObj?.rawProgramBody as string) || JSON.stringify(call, null, 2),
  };

  // Add file info when combining multiple files
  if (includeFileInfo) {
    step.actId = actId;
    step.fileName = fileName;
  }

  return step;
}

/**
 * Helper function to parse old format calls JSON
 */
function parseOldFormat(
  jsonData: unknown[],
  filePath: string,
  includeFileInfo: boolean
): ActionData | null {
  const firstStep: Record<string, unknown> = jsonData[0] as Record<string, unknown>;
  const request: Record<string, unknown> = firstStep?.request as Record<string, unknown>;
  const agentRunCreate: Record<string, unknown> = request?.agentRunCreate as Record<
    string,
    unknown
  >;
  const kwargs: Record<string, unknown> = firstStep?.kwargs as Record<string, unknown>;

  const sessionId: string = agentRunCreate?.workflowRunId as string;
  const actId: string = (agentRunCreate?.id as string) || path.basename(filePath, '_calls.json');
  const prompt: string =
    (request?.prompt as string) ||
    (agentRunCreate?.task as string) ||
    (kwargs?.task as string) ||
    'No prompt available';
  const fileName: string = path.basename(filePath);

  const steps: ActionStep[] = jsonData.map((call, index) =>
    createActionStep(call as Record<string, unknown>, index, actId, fileName, includeFileInfo)
  );

  return { actId, prompt, steps, isFolder: false, fileCount: 1, sessionId };
}

/**
 * Helper function to parse new format calls JSON
 */
function parseNewFormat(
  jsonData: NewFormatRoot,
  filePath: string,
  includeFileInfo: boolean
): ActionData | null {
  const { metadata, steps: stepsArray } = jsonData;

  const sessionId: string = metadata.session_id || '';
  const actId: string = metadata.act_id || path.basename(filePath, '_calls.json');
  const prompt: string = metadata.prompt || 'No prompt available';
  const fileName: string = path.basename(filePath);

  const steps: ActionStep[] = stepsArray.map((call, index) =>
    createActionStep(call as Record<string, unknown>, index, actId, fileName, includeFileInfo)
  );

  return { actId, prompt, steps, isFolder: false, fileCount: 1, sessionId };
}

/**
 * Helper function to parse calls JSON data into ActionData format
 */
export function parseCallsJsonData(
  jsonData: unknown,
  filePath: string,
  includeFileInfo = false
): ActionData | null {
  try {
    if (isNewFormat(jsonData)) {
      return parseNewFormat(jsonData, filePath, includeFileInfo);
    }

    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      return null;
    }

    return parseOldFormat(jsonData, filePath, includeFileInfo);
  } catch (_error) {
    return null;
  }
}

/**
 * Helper function to find corresponding JSON file for an HTML file
 */
export function findCorrespondingJsonFile(htmlFilePath: string): string | null {
  try {
    const dir: string = path.dirname(htmlFilePath);
    const baseName: string = path.basename(htmlFilePath, path.extname(htmlFilePath));

    // Try to find corresponding JSON file with pattern: <basename>_calls.json
    const jsonFileName: string = `${baseName}_calls.json`;
    const jsonFilePath: string = path.join(dir, jsonFileName);

    if (fs.existsSync(jsonFilePath)) {
      return jsonFilePath;
    }

    return null;
  } catch (_error) {
    return null;
  }
}
