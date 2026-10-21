import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['**/*.test.js'],
          exclude: [...configDefaults.exclude, 'tests/behavior/**']
        }
      },
      {
        test: {
          name: 'behavior',
          include: ['tests/behavior/**/*.test.js'],
          setupFiles: ['tests/behavior/fake-timers.setup.js']
        }
      }
    ]
  }
})
