/**
 * Validates a family member's name.
 * Rule: Non-empty, max 150 characters.
 */
export function validateMemberName(name: unknown): { valid: boolean; error?: string; cleanName?: string } {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Name must be text.' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Please enter a family member name.' };
  }

  if (trimmed.length > 150) {
    return { valid: false, error: 'Name cannot exceed 150 characters.' };
  }

  return { valid: true, cleanName: trimmed };
}
