// Common messages shared among all webviews and the extension
import { type TelemetryEvent, type WebviewKind } from '../telemetry/events';

export type WebviewErrorMessage = {
  command: 'captureWebviewError';
  kind: WebviewKind;
  errorMessage: string;
};

export type TelemetryCommand = {
  command: 'sendTelemetry';
} & TelemetryEvent;

export type CommonToExtensionMessage = WebviewErrorMessage | TelemetryCommand;
