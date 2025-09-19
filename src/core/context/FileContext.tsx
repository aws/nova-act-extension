import { createContext, useContext, useState } from 'react';

type FileContext = {
  hasUnsavedChanges: boolean;
  fileContent?: string;
  fileLocation?: string;
  clearFileContent: () => void;
  clearFileLocation: () => void;
  setHasUnsavedChanges: (b: boolean) => void;
  setFileContent: (c?: string) => void;
  setFileLocation: (n?: string) => void;
};

const FileContext = createContext<FileContext | undefined>(undefined);

const FileProvider = ({ children }: { children: React.ReactNode }) => {
  const [fileContent, setFileContent] = useState<string | undefined>(undefined);
  const [fileLocation, setFileLocation] = useState<string | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const clearFileContent = () => {
    setFileContent(undefined);
  };

  const clearFileLocation = () => {
    setFileLocation(undefined);
  };

  const maybeSetHasUnsavedChanges = (hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  };

  const value = {
    fileContent,
    fileLocation,
    hasUnsavedChanges,
    setHasUnsavedChanges: maybeSetHasUnsavedChanges,
    clearFileContent,
    clearFileLocation,
    setFileContent,
    setFileLocation,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};

const useFile = () => {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context;
};

export { FileProvider, useFile };
