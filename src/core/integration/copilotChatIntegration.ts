import * as vscode from 'vscode';

import {
  type ChatTemplate,
  LEARN_MORE_TEMPLATE,
  NOVA_ACT_TEMPLATE_V1,
} from '../../chatTemplate/novaActV1';
import { NOVA_ACT_EXTRACT_TEMPLATE } from '../../chatTemplate/novaActV1Extract';
import { NOVA_ACT_FORM_FILLING_TEMPLATE } from '../../chatTemplate/novaActV1FormFilling';
import { NOVA_ACT_SEARCH_TEMPLATE } from '../../chatTemplate/novaActV1Search';
import { NOVA_ACT_SHOPPING_TEMPLATE } from '../../chatTemplate/novaActV1Shopping';
import { NOVA_ACT_QA_TESTS_TEMPLATE } from '../../chatTemplate/novaActV1UiQaTests';
import { NOVA_ACT_WORKFLOW_TEMPLATE } from '../../chatTemplate/novaActV1Workflow';
import { ChatCommands, Commands } from '../../constants';
import { TelemetryClient } from '../telemetry/client';
import { CopilotChatCommand, FeatureName, ImportSource } from '../telemetry/events';
import { TAB_NAMES } from '../types/sidebarMessages';
import logger from '../utils/logger';
import { convertErrorToString } from '../utils/utils';

export function copilotChatIntegration() {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    ChatContext: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => {
    const telemetryClient = TelemetryClient.getInstance();
    try {
      logger.log(
        `Chat request received: ${request.command || 'default'} - "${request.prompt.substring(0, 50)}..."`
      );

      let prompt: ChatTemplate = NOVA_ACT_TEMPLATE_V1;
      if (request.command === ChatCommands.learn) {
        prompt = LEARN_MORE_TEMPLATE;
      } else if (request.command === ChatCommands.shopping) {
        prompt = NOVA_ACT_SHOPPING_TEMPLATE;
      } else if (request.command === ChatCommands.extract) {
        prompt = NOVA_ACT_EXTRACT_TEMPLATE;
      } else if (request.command === ChatCommands.search) {
        prompt = NOVA_ACT_SEARCH_TEMPLATE;
      } else if (request.command === ChatCommands.qa) {
        prompt = NOVA_ACT_QA_TESTS_TEMPLATE;
      } else if (request.command === ChatCommands.formfilling) {
        prompt = NOVA_ACT_FORM_FILLING_TEMPLATE;
      } else if (request.command === ChatCommands.workflow) {
        prompt = NOVA_ACT_WORKFLOW_TEMPLATE;
      }

      // Initialize the messages array for the API request.
      const messages = [vscode.LanguageModelChatMessage.User(prompt.prompt)];

      // Retrieve previous chat turns from the conversation history.
      const previousMessages = ChatContext.history.filter(
        (h) => h instanceof vscode.ChatResponseTurn
      );

      // Iterate through previous messages and add them to the 'messages' array.
      previousMessages.forEach((m) => {
        let fullMessage = '';
        m.response.forEach((r) => {
          const mdPart = r as vscode.ChatResponseMarkdownPart;
          fullMessage += mdPart.value.value;
        });
        messages.push(vscode.LanguageModelChatMessage.Assistant(fullMessage));
      });

      // Add the current user's message to the 'messages' array.
      messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

      // use default co-pilot LLM
      const chatResponse = await request.model.sendRequest(messages, {}, token);

      // Collect the response to extract code blocks
      let fullResponse = '';

      // stream the response
      for await (const fragment of chatResponse.text) {
        fullResponse += fragment;
        stream.markdown(fragment);
      }

      // Extract Python code blocks from the response
      const extractPythonCode = (text: string): string => {
        const pythonCodeRegex = /```python\n([\s\S]*?)\n```/g;
        const matches: string[] = [];
        let match;

        while ((match = pythonCodeRegex.exec(text)) !== null) {
          if (match[1]) {
            matches.push(match[1]);
          }
        }

        // Return only the latest (last) code block
        return matches.length > 0 ? matches[matches.length - 1]! : '';
      };

      const extractedCode = extractPythonCode(fullResponse);

      // Only show the button if there's extracted code
      if (extractedCode.trim()) {
        stream.markdown('\n\n---\n\n');
        stream.button({
          command: Commands.showBuilderMode,
          title: vscode.l10n.t('Continue in Builder Mode'),
          arguments: [
            {
              initialContent: extractedCode,
              initialContentSource: ImportSource.COPILOT,
              initialTab: TAB_NAMES.BUILD,
            },
          ],
        });
      }
      stream.markdown('\n\n---\n\n*Learn more about [Nova Act](https://nova.amazon.com/act)*');

      try {
        // If it's the first message in the conversation, mark feature activation
        if (previousMessages.length === 0) {
          telemetryClient.captureFeatureActivated(FeatureName.COPILOT_CHAT);
        }

        // Determine telemetry command based on request command
        let telemetryCommand = CopilotChatCommand.DEFAULT;
        if (request.command === ChatCommands.learn) {
          telemetryCommand = CopilotChatCommand.LEARN;
        } else if (request.command === ChatCommands.shopping) {
          telemetryCommand = CopilotChatCommand.SHOPPING;
        } else if (request.command === ChatCommands.extract) {
          telemetryCommand = CopilotChatCommand.EXTRACT;
        } else if (request.command === ChatCommands.search) {
          telemetryCommand = CopilotChatCommand.SEARCH;
        } else if (request.command === ChatCommands.qa) {
          telemetryCommand = CopilotChatCommand.QA_TESTS;
        } else if (request.command === ChatCommands.formfilling) {
          telemetryCommand = CopilotChatCommand.FORM_FILLING;
        } else if (request.command === ChatCommands.workflow) {
          telemetryCommand = CopilotChatCommand.DEFAULT;
        }

        telemetryClient.captureChatMessageSent(telemetryCommand);
      } catch (error) {
        logger.debug(`Telemetry error: ${error}`);
      }
    } catch (error) {
      const errorMessage = `Copilot chat handler failed: ${convertErrorToString(error)}`;
      logger.error(errorMessage);
      telemetryClient.captureExtensionHostError(errorMessage);
      // Re-throw so VS Code surfaces the error
      throw error;
    }
  };

  vscode.chat.createChatParticipant('nova-agent-vs-code-ext.nova-act', handler);
}
