const FORBIDDEN_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i,
  /;\s*(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i,
  /--/,
  /\/\*/,
  /\bEXEC\b/i,
  /\bEXECUTE\b/i,
  /\bxp_/i,
  /\bsp_/i,
];

const MAX_QUERY_LENGTH = 5000;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateQuery(sql: string): ValidationResult {
  if (!sql || sql.trim().length === 0) {
    return { valid: false, reason: "Query cannot be empty." };
  }

  if (sql.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      reason: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters.`,
    };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sql)) {
      return {
        valid: false,
        reason: "Query contains forbidden operation. Only SELECT queries are allowed.",
      };
    }
  }

  const trimmed = sql.trim().toUpperCase();
  if (
    !trimmed.startsWith("SELECT") &&
    !trimmed.startsWith("WITH") &&
    !trimmed.startsWith("EXPLAIN")
  ) {
    return {
      valid: false,
      reason: "Query must be a SELECT, WITH (CTE), or EXPLAIN statement.",
    };
  }

  return { valid: true };
}
