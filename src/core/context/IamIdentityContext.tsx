import React, {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { builderModeVscodeApi } from '../utils/vscodeApi';

interface CredentialsMessage {
  success: boolean;
  identity?: { Arn?: string };
  isRefresh?: boolean;
}

interface IamIdentityContextType {
  iamIdentity: string;
  isRefreshing: boolean;
  credentialStatus: 'valid' | 'invalid' | 'checking';
  refreshCredentials: () => void;
}

const IamIdentityContext = createContext<IamIdentityContextType | undefined>(undefined);

interface IamIdentityProviderProps {
  children: ReactNode;
}

export const IamIdentityProvider: React.FC<IamIdentityProviderProps> = ({ children }) => {
  const [iamIdentity, setIamIdentity] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [credentialStatus, setCredentialStatus] = useState<'valid' | 'invalid' | 'checking'>(
    'checking'
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'awsCredentialsValidationResult' && event.data.isRefresh) {
        handleCredentialRefresh(event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    refreshCredentials();
  }, []);

  const handleCredentialRefresh = useCallback((message: CredentialsMessage) => {
    setIsRefreshing(false);
    if (message.success && message.identity?.Arn) {
      setIamIdentity(message.identity.Arn);
      setCredentialStatus('valid');
    } else {
      setIamIdentity('');
      setCredentialStatus('invalid');
    }
  }, []);

  const refreshCredentials = useCallback(() => {
    setIsRefreshing(true);
    setCredentialStatus('checking');
    builderModeVscodeApi?.postMessage({
      command: 'validateAwsCredentials',
      isRefresh: true,
    });
  }, []);

  const value: IamIdentityContextType = {
    iamIdentity,
    isRefreshing,
    credentialStatus,
    refreshCredentials,
  };

  return <IamIdentityContext.Provider value={value}>{children}</IamIdentityContext.Provider>;
};

export const useIamIdentity = (): IamIdentityContextType => {
  const context = useContext(IamIdentityContext);
  if (!context) {
    throw new Error('useIamIdentity must be used within IamIdentityProvider');
  }
  return context;
};
