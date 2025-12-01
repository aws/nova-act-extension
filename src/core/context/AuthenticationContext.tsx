import React, {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { builderModeVscodeApi } from '../utils/vscodeApi';

// Separation of Concerns:
// - AuthenticationContext: Handles auth method selection and initial validation in Authenticate tab
// - IamIdentityContext: Handles credential state for Deploy tab and ControlBar
// Both contexts listen to 'awsCredentialsValidationResult' messages with different isRefresh flags
// Future: Consider consolidating if auth method selection moves to settings

interface CredentialValidationMessage {
  success: boolean;
  identity?: {
    Arn: string;
  };
}

interface AuthenticationState {
  authMethod: 'apiKey' | 'aws' | 'none';
  apiKeyStatus: boolean;
  awsCredentialStatus: 'valid' | 'invalid' | 'checking';
  iamIdentity: string;
  apiKey: string;
}

interface AuthenticationActions {
  setAuthMethod: (method: 'apiKey' | 'aws') => void;
  validateAwsCredentials: () => void;
  checkApiKeyStatus: () => void;
  setApiKeyStatus: (status: boolean) => void;
  setAwsCredentialStatus: (status: 'valid' | 'invalid' | 'checking') => void;
  setIamIdentity: (identity: string) => void;
  fetchApiKey: () => void;
}

type AuthenticationContextType = AuthenticationState & AuthenticationActions;

const AuthenticationContext = createContext<AuthenticationContextType | undefined>(undefined);

interface AuthenticationProviderProps {
  children: ReactNode;
}

export const AuthenticationProvider: React.FC<AuthenticationProviderProps> = ({ children }) => {
  const [authMethod, setAuthMethod] = useState<'apiKey' | 'aws' | 'none'>('none');
  const [apiKeyStatus, setApiKeyStatus] = useState<boolean>(false);
  const [awsCredentialStatus, setAwsCredentialStatus] = useState<'valid' | 'invalid' | 'checking'>(
    'checking'
  );
  const [iamIdentity, setIamIdentity] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    checkApiKeyStatus();
    validateAwsCredentials();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle all credential validation messages to keep button state in sync
      // IamIdentityContext also handles messages WITH isRefresh flag (from Deploy tab)
      if (event.data.type === 'awsCredentialsValidationResult') {
        handleCredentialValidation(event.data);
      }

      if (event.data.type === 'apiKeyStatusResult') {
        setApiKeyStatus(event.data.hasApiKey);
      }

      if (event.data.type === 'apiKeyResult') {
        setApiKey(event.data.apiKey || '');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCredentialValidation = useCallback((message: CredentialValidationMessage) => {
    if (message.success && message.identity?.Arn) {
      setIamIdentity(message.identity.Arn);
      setAwsCredentialStatus('valid');
      setAuthMethod('aws');
    } else {
      setAwsCredentialStatus('invalid');
    }
  }, []);

  const validateAwsCredentials = useCallback(() => {
    setAwsCredentialStatus('checking');
    builderModeVscodeApi?.postMessage({
      command: 'validateAwsCredentials',
      isRefresh: false,
    });
  }, []);

  const checkApiKeyStatus = useCallback(() => {
    builderModeVscodeApi?.postMessage({
      command: 'checkApiKeyStatus',
    });
  }, []);

  const fetchApiKey = useCallback(() => {
    builderModeVscodeApi?.postMessage({
      command: 'getApiKey',
    });
  }, []);

  const value: AuthenticationContextType = {
    authMethod,
    apiKeyStatus,
    awsCredentialStatus,
    iamIdentity,
    apiKey,
    setAuthMethod,
    validateAwsCredentials,
    checkApiKeyStatus,
    setApiKeyStatus,
    setAwsCredentialStatus,
    setIamIdentity,
    fetchApiKey,
  };

  return <AuthenticationContext.Provider value={value}>{children}</AuthenticationContext.Provider>;
};

export const useAuthentication = (): AuthenticationContextType => {
  const context = useContext(AuthenticationContext);
  if (!context) {
    throw new Error('useAuthentication must be used within AuthenticationProvider');
  }
  return context;
};
