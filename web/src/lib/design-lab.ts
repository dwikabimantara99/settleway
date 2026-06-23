export function isDesignLabEnabled(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv !== 'production';
}
