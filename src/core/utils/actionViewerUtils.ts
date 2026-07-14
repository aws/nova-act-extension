import * as fs from 'fs';
import * as path from 'path';

import { type ActionData, type ActionStep } from '../types/actionViewerMessages';

interface NewFormatMetadata {
  session_id?: string;
  act_id?: string;
  prompt?: string;
  start_time?: number;
  num_steps_executed?: number;
  step_server_times_s?: number[];
}

interface NewFormatRoot {
  steps: unknown[];
  metadata: NewFormatMetadata;
}

/**
 * Represents a single step in the trajectory format (Nova Act SDK >= 3.3.35).
 * Note: simplified_dom is present in the file but intentionally not rendered
 * in the Action Viewer UI since it's a raw accessibility tree snapshot used
 * by the model, not useful for human debugging.
 */
interface TrajectoryStep {
  active_url?: string;
  image?: string;
  simplified_dom?: string;
  program?: {
    calls?: Array<{
      name?: string;
      kwargs?: Record<string, unknown>;
    }>;
  };
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
 * Helper function to detect if the new format data is specifically a trajectory file
 * (has steps with active_url/image/program structure rather than request/response).
 * Note: This checks the first step only. If the first step is malformed but subsequent
 * steps are valid trajectory steps, detection will fail and the old parser will be used.
 * In practice, trajectory files always have consistent step structure.
 */
function isTrajectoryFormat(jsonData: NewFormatRoot): boolean {
  if (jsonData.steps.length === 0) return false;
  const firstStep = jsonData.steps[0] as Record<string, unknown>;
  return 'active_url' in firstStep || 'program' in firstStep;
}

/**
 * Helper function to create an ActionStep from a trajectory step object
 */
function createTrajectoryActionStep(
  step: TrajectoryStep,
  index: number,
  timestamp: string,
  actId: string,
  fileName: string,
  includeFileInfo: boolean
): ActionStep {
  // Build action data from program calls
  let actionData: string | undefined;
  if (step.program?.calls && step.program.calls.length > 0) {
    const actionParts = step.program.calls
      .map((call) => {
        if (call.name === 'think') {
          return `think(${JSON.stringify((call.kwargs?.value as string) || '')})`;
        }
        const args = call.kwargs
          ? Object.entries(call.kwargs)
              .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
              .join(', ')
          : '';
        return `${call.name || 'unknown'}(${args})`;
      })
      .join('\n');
    actionData = actionParts;
  }

  // Handle image data - add data URI prefix if it's raw base64
  let imageData: string | undefined;
  if (step.image) {
    imageData = step.image.startsWith('data:')
      ? step.image
      : `data:image/jpeg;base64,${step.image}`;
  }

  const result: ActionStep = {
    stepNumber: index + 1,
    currentUrl: step.active_url || 'No URL available',
    timestamp,
    imageData,
    actionData,
  };

  if (includeFileInfo) {
    result.actId = actId;
    result.fileName = fileName;
  }

  return result;
}

/**
 * Helper function to parse trajectory format JSON (Nova Act SDK >= 3.x)
 */
function parseTrajectoryFormat(
  jsonData: NewFormatRoot,
  filePath: string,
  includeFileInfo: boolean
): ActionData | null {
  const { metadata, steps: stepsArray } = jsonData;

  const sessionId: string = metadata.session_id || '';
  const actId: string = metadata.act_id || path.basename(filePath, '_trajectory.json');
  const prompt: string = metadata.prompt || 'No prompt available';
  const fileName: string = path.basename(filePath);
  const startTime: number = metadata.start_time || 0;
  const stepTimes: number[] = metadata.step_server_times_s || [];

  const steps: ActionStep[] = stepsArray.map((step, index) => {
    // Compute cumulative offset from step_server_times_s for accurate per-step timestamps.
    // If stepTimes is shorter than the steps array (e.g., interrupted session),
    // steps beyond the array get 'N/A' rather than a misleading duplicate timestamp.
    let stepTimestamp: string;
    if (startTime && stepTimes.length > index) {
      const cumulativeOffset = stepTimes.slice(0, index).reduce((sum, t) => sum + t, 0);
      stepTimestamp = new Date((startTime + cumulativeOffset) * 1000).toISOString();
    } else {
      stepTimestamp = 'N/A';
    }

    return createTrajectoryActionStep(
      step as TrajectoryStep,
      index,
      stepTimestamp,
      actId,
      fileName,
      includeFileInfo
    );
  });

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
      if (isTrajectoryFormat(jsonData)) {
        return parseTrajectoryFormat(jsonData, filePath, includeFileInfo);
      }
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
    const callsJsonFileName: string = `${baseName}_calls.json`;
    const callsJsonFilePath: string = path.join(dir, callsJsonFileName);

    if (fs.existsSync(callsJsonFilePath)) {
      return callsJsonFilePath;
    }

    // Fallback: try _trajectory.json pattern
    const trajectoryJsonFileName: string = `${baseName}_trajectory.json`;
    const trajectoryJsonFilePath: string = path.join(dir, trajectoryJsonFileName);

    if (fs.existsSync(trajectoryJsonFilePath)) {
      return trajectoryJsonFilePath;
    }

    return null;
  } catch (_error) {
    return null;
  }
}
