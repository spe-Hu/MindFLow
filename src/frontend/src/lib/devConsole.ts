/**
 * Development-only console helpers.
 * In production, all calls are no-ops and should be tree-shaken away.
 */
const isDev = import.meta.env.DEV

export const devLog = isDev ? console.log.bind(console) : () => undefined
export const devWarn = isDev ? console.warn.bind(console) : () => undefined
export const devError = isDev ? console.error.bind(console) : () => undefined
