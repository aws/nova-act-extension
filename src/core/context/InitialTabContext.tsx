import { createContext, useContext, useState } from 'react';

type InitialTabContext = {
  activeTab: string;
  navigateToTab: (tab: string) => void;
};

const InitialTabContext = createContext<InitialTabContext | undefined>(undefined);

const InitialTabProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<string>('build');

  const value = {
    activeTab,
    navigateToTab: setActiveTab,
  };

  return <InitialTabContext.Provider value={value}>{children}</InitialTabContext.Provider>;
};

const useInitialTab = () => {
  const context = useContext(InitialTabContext);
  if (context === undefined) {
    throw new Error('useInitialTab must be used within an InitialTabProvider');
  }
  return context;
};

export { InitialTabProvider, useInitialTab };
