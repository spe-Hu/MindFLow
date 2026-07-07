import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  use: {
    ...(base as any).use,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  },
})
