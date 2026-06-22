export function isEscapeDismissKey(key: string): boolean {
  return key === 'Escape';
}

export function isMarketplaceOpenKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'ArrowDown';
}

export function getNextFocusIndex(
  currentIndex: number,
  totalItems: number,
  moveBackward: boolean,
): number {
  if (totalItems <= 0) {
    return -1;
  }

  if (currentIndex === -1) {
    return moveBackward ? totalItems - 1 : 0;
  }

  const nextIndex = moveBackward ? currentIndex - 1 : currentIndex + 1;

  if (nextIndex < 0) {
    return totalItems - 1;
  }

  if (nextIndex >= totalItems) {
    return 0;
  }

  return nextIndex;
}
