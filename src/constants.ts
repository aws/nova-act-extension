/**
 * Constants for Nova Act extension
 * Centralized command identifiers and other constants
 */

export enum Commands {
  openWalkthrough = 'nova-agent-vs-code-ext.openWalkthrough',
  viewNovaActStepDetails = 'nova-agent-vs-code-ext.viewNovaActStepDetails',
  updateOrInstallWheel = 'nova-agent-vs-code-ext.updateOrInstallWheel',
  showBuilderMode = 'nova-agent-vs-code-ext.showBuilderMode',
  setApiKey = 'nova-agent-vs-code-ext.setApiKey',
  showMenu = 'nova-agent-vs-code-ext.showMenu',
  sidebar = 'nova-agent-vs-code-ext.sidebar',
  openActionViewer = 'nova-agent-vs-code-ext.openActionViewer',
  getNovaActVersion = 'nova-agent-vs-code-ext.getNovaActVersion',
}

// VS Code built-in commands
export enum VSCodeCommands {
  openWalkthrough = 'workbench.action.openWalkthrough',
  closeSidebar = 'workbench.action.closeSidebar',
  openCopilotChat = 'workbench.panel.chat.view.copilot.focus',
  activitybar = 'workbench.view.extension.nova-agent-vs-code-ext-activitybar',
}

// Other constants
export const NOVA_ACT_API_KEY = 'novaAgentApiKey';
export const EXTENSION_ID = 'amazonwebservices.amazon-nova-act-extension';
export const WALKTHROUGH_ID = 'novaAgentWalkthrough';
export const KIRO_WALKTHROUGH_ID = 'novaAgentKiroWalkthrough';
export const GENERIC_WALKTHROUGH_ID = 'novaAgentGenericWalkthrough';

export enum ChatCommands {
  learn = 'learn',
  shopping = 'shopping',
  extract = 'extract',
  search = 'search',
  qa = 'qa',
  formfilling = 'formfilling',
}

export enum GlobalStateCommands {
  hasShownWalkthrough = 'novaAct.hasShownWalkthrough',
  isExtensionInstalled = 'novaAct.isExtensionInstalled',
  hasShownInstallNotification = 'novaAct.hasShownInstallNotification',
  installId = 'novaAct.installId',
}

export const BACKEND_WS_PORT = 8001;
