import React from 'react';

import { type WebviewKind } from '../core/telemetry/events';
import { convertErrorToString } from '../core/utils/utils';
import { reportWebviewError } from '../core/utils/webviewErrorBridge';

type Props = { children: React.ReactNode; kind: WebviewKind };
type State = { hasError: boolean };

/**
 * A React error boundary that catches errors in its child component tree
 * Also reports the error via the telemetry client if telemetry is enabled
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, _info: React.ErrorInfo) {
    const errorMessage = `Error: ${convertErrorToString(error)}`;
    reportWebviewError({
      kind: this.props.kind,
      errorMessage,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
        }}
      >
        <div>Something went wrong. Please try to reload the extension</div>
      </div>
    );
  }
}
