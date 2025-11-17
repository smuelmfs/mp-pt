/**
 * Parse Zod validation errors into a structured format
 * Returns an object with field names as keys and error messages as values
 */
export function parseZodErrors(errorData: any): {
  fieldErrors: Record<string, string>;
  formErrors: string[];
  generalMessage: string;
} {
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];
  let generalMessage = "Erro de validação";

  if (!errorData) {
    return { fieldErrors, formErrors, generalMessage };
  }

  // Handle different error formats
  if (errorData.error) {
    const error = errorData.error;

    // String error
    if (typeof error === 'string') {
      generalMessage = error;
      return { fieldErrors, formErrors, generalMessage };
    }

    // Error with message
    if (error.message) {
      generalMessage = error.message;
    }

    // Zod formErrors (array of strings)
    if (error.formErrors && Array.isArray(error.formErrors)) {
      formErrors.push(...error.formErrors);
      if (formErrors.length > 0 && !generalMessage) {
        generalMessage = formErrors[0];
      }
    }

    // Zod fieldErrors (object with field names as keys)
    if (error.fieldErrors && typeof error.fieldErrors === 'object') {
      Object.keys(error.fieldErrors).forEach((field) => {
        const fieldError = error.fieldErrors[field];
        if (Array.isArray(fieldError) && fieldError.length > 0) {
          fieldErrors[field] = fieldError[0];
        } else if (typeof fieldError === 'string') {
          fieldErrors[field] = fieldError;
        }
      });
    }
  }

  // If no specific message found, use a default
  if (!generalMessage && formErrors.length === 0 && Object.keys(fieldErrors).length === 0) {
    generalMessage = "Erro ao processar requisição";
  }

  return { fieldErrors, formErrors, generalMessage };
}

/**
 * Get error message for a specific field
 */
export function getFieldError(fieldErrors: Record<string, string>, fieldName: string): string | undefined {
  return fieldErrors[fieldName];
}

/**
 * Check if a field has an error
 */
export function hasFieldError(fieldErrors: Record<string, string>, fieldName: string): boolean {
  return !!fieldErrors[fieldName];
}



