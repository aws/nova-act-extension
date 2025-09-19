import { useAgentMessages } from '../../../core/context/AgentMessagesContext';
import { Tooltip } from '../Tooltip';
import './index.css';

interface AgentOverlayProps {
  isVisible: boolean;
}

export const AgentOverlay = ({ isVisible }: AgentOverlayProps) => {
  const { agentMessages, clearAgentMessage } = useAgentMessages();

  // Only show overlay if there are messages and it's visible
  if (!isVisible || agentMessages.length === 0) {
    return null;
  }

  return (
    <div className="agent-overlay visible">
      <div className="agent-overlay-content">
        {agentMessages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <span className="message-text">
              {message.type === 'think'
                ? `> Think: ${message.content}`
                : `>> agent${message.actionType ? message.actionType.charAt(0).toUpperCase() + message.actionType.slice(1) : ''}: ${message.content}`}
            </span>
            <Tooltip content="Close message" position="right">
              <button
                onClick={() => clearAgentMessage(message.id)}
                className="message-close"
                aria-label="Close message"
              >
                ×
              </button>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
};
