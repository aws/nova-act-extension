import * as vscode from 'vscode';

import { GENERIC_WALKTHROUGH_ID, KIRO_WALKTHROUGH_ID, WALKTHROUGH_ID } from '../../constants';
import logger from './logger';

/**
 * Enum for supported IDEs
 */
export enum IDE {
  VSCODE = 'vscode',
  KIRO = 'kiro',
  UNKNOWN = 'unknown',
  CURSOR = 'cursor',
}

/**
 * Detects the current IDE based on app name
 * @returns The detected IDE type
 */
export function detectIDE(): IDE {
  // Use app name to detect IDE
  try {
    const appName = vscode.env.appName?.toLowerCase();
    if (appName?.includes('kiro')) {
      return IDE.KIRO;
    }
    if (appName?.includes('visual studio code') || appName?.includes('vscode')) {
      return IDE.VSCODE;
    }
    if (appName?.includes('cursor')) {
      return IDE.CURSOR;
    }
  } catch (error) {
    logger.error(`Error detecting IDE from app name: ${error}`);
    // If we can't determine, assume VS Code as fallback
    return IDE.VSCODE;
  }
  return IDE.VSCODE;
}

/**
 * Gets the appropriate walkthrough ID based on the detected IDE
 * @param vscodeWalkthroughId The walkthrough ID for VS Code
 * @param kiroWalkthroughId The walkthrough ID for Kiro
 * @returns The appropriate walkthrough ID for the current IDE
 */
export function getWalkthroughIdForIDE(): string {
  const currentIDE = detectIDE();

  switch (currentIDE) {
    case IDE.KIRO:
      return KIRO_WALKTHROUGH_ID;
    case IDE.VSCODE:
      return WALKTHROUGH_ID;
    case IDE.UNKNOWN:
    case IDE.CURSOR:
    default:
      return GENERIC_WALKTHROUGH_ID;
  }
}
