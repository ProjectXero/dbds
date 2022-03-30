export const match = (
  left: unknown,
  right: unknown,
  ignoreCase = false
): boolean => {
  if (typeof left === 'string' && typeof right === 'string' && ignoreCase) {
    return left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0
  }
  return left === right
}

export const identity = <T>(value: T): T => value
