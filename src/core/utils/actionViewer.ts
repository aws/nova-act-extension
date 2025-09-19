import { builderModeVscodeApi } from './vscodeApi';

/**
 * Helper function to detect HTML files in output text
 */
export const getHtmlFilePath = (output: string): string | null => {
  if (!output) {
    return null;
  }

  // Pattern: ** View your act run here: <path_to_html_file>
  const htmlFileRegex = /\*\*\s*View your act run here:\s*(.*\.html)/;
  const match = output.match(htmlFileRegex);

  return match && match[1] ? match[1] : null;
};

/**
 * Helper function to find all HTML file paths in output text
 */
export const getAllHtmlFilePaths = (
  output: string
): Array<{ filePath: string; startIndex: number; endIndex: number }> => {
  if (!output) {
    return [];
  }

  const htmlFileRegex = /\*\*\s*View your act run here:\s*(.*\.html)/g;
  const matches: Array<{ filePath: string; startIndex: number; endIndex: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = htmlFileRegex.exec(output)) !== null) {
    const filePath = match[1];
    if (filePath) {
      matches.push({
        filePath,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return matches;
};

/**
 * Helper function to extract session directory from HTML file path
 */
export const getSessionDirectoryFromHtmlPath = (htmlFilePath: string): string | null => {
  if (!htmlFilePath) {
    return null;
  }

  try {
    // Get the directory containing the HTML file (which should be the session directory)
    // Handle both Unix and Windows path separators
    const lastSlashIndex = Math.max(htmlFilePath.lastIndexOf('/'), htmlFilePath.lastIndexOf('\\'));
    if (lastSlashIndex === -1) {
      return null; // No directory separator found
    }
    const sessionDir = htmlFilePath.substring(0, lastSlashIndex);
    return sessionDir || null;
  } catch (_error) {
    return null;
  }
};

/**
 * Opens the action viewer with the specified file or folder path
 */
export const openActionViewer = (
  htmlFilePath?: string,
  actionViewerFilePath?: string,
  actionViewerFolderPath?: string
): void => {
  if ((htmlFilePath || actionViewerFilePath || actionViewerFolderPath) && builderModeVscodeApi) {
    builderModeVscodeApi.postMessage({
      command: 'openActionViewer',
      htmlFilePath,
      actionViewerFilePath,
      actionViewerFolderPath,
    });
  }
};

/**
 * Opens the session viewer for the session containing the specified HTML file
 */
export const openSessionViewer = (htmlFilePath: string): void => {
  const sessionDirectory = getSessionDirectoryFromHtmlPath(htmlFilePath);
  if (sessionDirectory && builderModeVscodeApi) {
    builderModeVscodeApi.postMessage({
      command: 'openActionViewer',
      actionViewerFolderPath: sessionDirectory,
    });
  }
};

/**
 * Helper function to handle opening action viewer from output text
 */
export const handleOpenActionViewer = (output: string): void => {
  const htmlFilePath = getHtmlFilePath(output);
  if (htmlFilePath) {
    openActionViewer(htmlFilePath);
  }
};
