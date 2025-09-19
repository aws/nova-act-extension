import { createContext, useContext, useState } from 'react';

type OutputContext = {
  selectedOutput?: number;
  setSelectedOutput: (o?: number) => void;
};

const OutputContext = createContext<OutputContext | undefined>(undefined);

const OutputProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedOutput, setSelectedOutput] = useState<number | undefined>(undefined);

  const value = {
    selectedOutput,
    setSelectedOutput,
  };

  return <OutputContext.Provider value={value}>{children}</OutputContext.Provider>;
};

const useOutput = () => {
  const context = useContext(OutputContext);
  if (context === undefined) {
    throw new Error('useOutput must be used within a OutputProvider');
  }
  return context;
};

export { OutputProvider, useOutput };
