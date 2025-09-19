import { createContext, useContext, useState } from 'react';

export interface AgentMessage {
  id: string;
  type: 'think' | 'agent';
  content: string;
  timestamp: number;
  actionType?: string; // For agent actions like "click", "type", etc.
}

type AgentMessageContext = {
  agentMessages: AgentMessage[];
  addAgentMessage: (rawData: string) => void;
  clearAgentMessage: (id: string) => void;
};

const AgentMessageContext = createContext<AgentMessageContext | undefined>(undefined);

const AgentMessagesProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [messageTimeouts, setMessageTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const addAgentMessage = (rawData: string) => {
    const newMessages: AgentMessage[] = [];

    // Find all think() patterns
    const thinkMatches = rawData.matchAll(/think\("([^"]+)"\)/gi);
    for (const match of thinkMatches) {
      if (match[1]) {
        const messageId = Date.now().toString() + '_think_' + Math.random();
        newMessages.push({
          id: messageId,
          type: 'think',
          content: match[1],
          timestamp: Date.now(),
        });
      }
    }

    // Find all agent*() patterns and extract action type
    const agentMatches = rawData.matchAll(/agent([A-Za-z]+)\(([^)]+)\)/gi);
    for (const match of agentMatches) {
      if (match[1] && match[2]) {
        // Extract the first quoted string from the parameters
        const paramMatch = match[2].match(/"([^"]+)"/);
        const content = paramMatch?.[1] || match[2].trim() || '';

        const messageId = Date.now().toString() + '_agent_' + Math.random();
        newMessages.push({
          id: messageId,
          type: 'agent',
          content,
          actionType: match[1].toLowerCase(), // Extract action type like "click", "type", etc.
          timestamp: Date.now(),
        });
      }
    }

    if (newMessages.length > 0) {
      // Add new messages to the list
      setMessages((prev) => [...prev, ...newMessages]);

      // Set timeouts for each new message
      newMessages.forEach((message) => {
        const timeout = setTimeout(() => {
          setMessages((prev) => prev.filter((m) => m.id !== message.id));
          setMessageTimeouts((prev) => {
            const newMap = new Map(prev);
            newMap.delete(message.id);
            return newMap;
          });
        }, 5500);

        setMessageTimeouts((prev) => new Map(prev).set(message.id, timeout));
      });
    }
  };

  const clearAgentMessage = (messageId: string) => {
    const timeout = messageTimeouts.get(messageId);
    if (timeout) {
      clearTimeout(timeout);
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setMessageTimeouts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      return newMap;
    });
  };

  const value = {
    agentMessages: messages,
    addAgentMessage,
    clearAgentMessage,
  };

  return <AgentMessageContext.Provider value={value}>{children}</AgentMessageContext.Provider>;
};

const useAgentMessages = () => {
  const context = useContext(AgentMessageContext);
  if (context === undefined) {
    throw new Error('useAgentMessages must be used within a AgentMessagesProvider');
  }
  return context;
};

export { AgentMessagesProvider, useAgentMessages };
