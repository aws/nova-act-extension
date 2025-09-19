const isError = (error: unknown): error is Error => {
  return (error as Error)?.message !== undefined;
};

// Exclude stack traces if enforcing property names in convertErrorToString
const BLOCKLISTED_KEYS = new Set(['stack']);

const propertyNames = (error: unknown) =>
  Object.getOwnPropertyNames(error).filter((key) => !BLOCKLISTED_KEYS.has(key));

export const convertErrorToString = (
  error: unknown | undefined | null | Error,
  forcePropertyNames: boolean = false
) => {
  const stringifiedMessage = (() => {
    if (error === undefined || error === null) {
      return '{}';
    }

    if (isError(error) && !forcePropertyNames) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return JSON.stringify(error, propertyNames(error));
  })();

  return stringifiedMessage;
};

export const concatMessage = (message: string) => {
  const MAX_LENGTH = 500;
  return message.length > MAX_LENGTH ? message.slice(0, MAX_LENGTH) + '...' : message;
};
