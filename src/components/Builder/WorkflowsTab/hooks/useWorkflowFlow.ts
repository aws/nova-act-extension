import { useEffect, useState } from 'react';

import { builderModeVscodeApi } from '../../../../core/utils/vscodeApi';

interface ExecutionState {
  payload: string;
  isExecuting: boolean;
  output: string;
  status: 'idle' | 'running' | 'success' | 'error';
  startTime?: Date;
  endTime?: Date;
}

interface WorkflowInfo {
  name: string;
}

interface WorkflowFlowState {
  workflows: WorkflowInfo[];
  isLoadingWorkflows: boolean;
  loadError: string | null;
  region: string;
  selectedWorkflowName: string | null;
  workflowStates: {
    [workflowName: string]: ExecutionState;
  };
}

const DEFAULT_EXECUTION_STATE: ExecutionState = {
  payload: '{}',
  isExecuting: false,
  output: '',
  status: 'idle',
};

const DEFAULT_REGION = 'us-east-1';

export const useWorkflowFlow = () => {
  const [state, setState] = useState<WorkflowFlowState>({
    workflows: [],
    isLoadingWorkflows: false,
    loadError: null,
    region: DEFAULT_REGION,
    selectedWorkflowName: null,
    workflowStates: {},
  });

  const getWorkflowState = (workflowName: string): ExecutionState => {
    return state.workflowStates[workflowName] || DEFAULT_EXECUTION_STATE;
  };

  const updateWorkflowState = (workflowName: string, updates: Partial<ExecutionState>): void => {
    setState((prev) => ({
      ...prev,
      workflowStates: {
        ...prev.workflowStates,
        [workflowName]: {
          ...getWorkflowState(workflowName),
          ...updates,
        },
      },
    }));
  };

  const getCurrentWorkflowState = (): ExecutionState => {
    if (!state.selectedWorkflowName) {
      return DEFAULT_EXECUTION_STATE;
    }
    return getWorkflowState(state.selectedWorkflowName);
  };

  const loadWorkflows = (): void => {
    setState((prev) => ({ ...prev, isLoadingWorkflows: true }));

    builderModeVscodeApi.postMessage({
      command: 'listWorkflows',
      region: state.region,
    });
  };

  const selectWorkflow = (workflowName: string): void => {
    setState((prev) => ({ ...prev, selectedWorkflowName: workflowName }));

    builderModeVscodeApi.postMessage({
      command: 'setActiveWorkflow',
      workflowName,
    });
  };

  const updatePayload = (workflowName: string, payload: string): void => {
    updateWorkflowState(workflowName, { payload });
  };

  const executeWorkflow = (workflowName: string): void => {
    const workflowState = getWorkflowState(workflowName);

    if (!workflowName) {
      return;
    }

    updateWorkflowState(workflowName, {
      isExecuting: true,
      status: 'running',
      output: '',
      startTime: new Date(),
    });

    builderModeVscodeApi.postMessage({
      command: 'invokeRuntime',
      name: workflowName,
      payload: workflowState.payload,
    });
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;

      if (msg.type === 'refreshWorkflowList') {
        loadWorkflows();
      }

      if (msg.type === 'workflowListResult') {
        setState((prev) => ({
          ...prev,
          workflows: msg.workflows,
          isLoadingWorkflows: false,
          loadError: msg.error || null,
        }));
      }

      if (msg.type === 'workflowOutputBuffer') {
        setState((prev) => ({
          ...prev,
          workflowStates: {
            ...prev.workflowStates,
            [msg.workflowName]: {
              ...(prev.workflowStates[msg.workflowName] || DEFAULT_EXECUTION_STATE),
              output: msg.output,
            },
          },
        }));
      }

      if (msg.type === 'invokeRuntimeProgress') {
        if (msg.workflowName) {
          setState((prev) => ({
            ...prev,
            workflowStates: {
              ...prev.workflowStates,
              [msg.workflowName]: {
                ...(prev.workflowStates[msg.workflowName] || DEFAULT_EXECUTION_STATE),
                output: (prev.workflowStates[msg.workflowName]?.output || '') + msg.output,
              },
            },
          }));
        }
      }

      if (msg.type === 'invokeRuntimeResult') {
        setState((prev) => ({
          ...prev,
          workflowStates: {
            ...prev.workflowStates,
            [msg.workflowName]: {
              ...(prev.workflowStates[msg.workflowName] || DEFAULT_EXECUTION_STATE),
              isExecuting: false,
              status: msg.success ? 'success' : 'error',
              endTime: new Date(),
              output: msg.output || prev.workflowStates[msg.workflowName]?.output || '',
            },
          },
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return {
    workflows: state.workflows,
    isLoadingWorkflows: state.isLoadingWorkflows,
    loadError: state.loadError,
    region: state.region,
    selectedWorkflowName: state.selectedWorkflowName,
    workflowStates: state.workflowStates,
    loadWorkflows,
    selectWorkflow,
    updatePayload,
    executeWorkflow,
    getCurrentWorkflowState,
  };
};
