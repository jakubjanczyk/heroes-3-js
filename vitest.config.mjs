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
          // Test files share a worker, its loaded modules and its jsdom page instead of starting
          // afresh, which halves the run; reset-page.setup.js keeps each test on a page of its own.
          isolate: false,
          setupFiles: ['tests/behavior/fake-timers.setup.js', 'tests/behavior/reset-page.setup.js']
        }
      }
    ]
  }
})
