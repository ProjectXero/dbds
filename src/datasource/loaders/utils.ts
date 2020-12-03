export const match = <T extends string | number>(
  left: T,
  right: T,
  ignoreCase = false
): boolean => {
  if (typeof left === 'string' && typeof right === 'string' && ignoreCase) {
    return left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0
  }
  return left === right
}

export const identity = <T>(value: T): T => value
