export function sanitizeString(param0) {
  const {value, options = {allowedPattern: undefined, useLengthCheck: true, min: 1, max: 12}} = param0;
  if (!options || !options?.allowedPattern) {
    return value;
  }

  const cleanValue = value.replace(new RegExp(`[^${options.allowedPattern}]`, 'gu'), '');

  if (options.useLengthCheck && (cleanValue.length < options.min || cleanValue.length > options.max)) {
    throw new Error(`Value given to sanitaze must be between ${options.min} and ${options.max} characaters`);
  }

  return cleanValue;
}
