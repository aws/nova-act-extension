export type PropertyValue =
  | { stringValue: string }
  | { numberValue: number }
  | { booleanValue: boolean }
  | { stringArrayValue: string[] };

export type RawPropertyValue = string | number | boolean | string[];
export type RawProperties = Record<string, RawPropertyValue>;
export type WrappedProperties = Record<string, PropertyValue>;

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x): x is string => typeof x === 'string');

const toPropertyValue = (v: RawPropertyValue): PropertyValue | undefined => {
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return { numberValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (isStringArray(v)) return { stringArrayValue: v };
  return undefined;
};

/**
 * Wrap telemetry event properties into the expected format
 */
export const wrapProperties = (props: RawProperties): WrappedProperties => {
  const output: Record<string, PropertyValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    const propertyValue = toPropertyValue(value);
    if (propertyValue !== undefined) {
      output[key] = propertyValue;
    }
  }
  return output;
};
