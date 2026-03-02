import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = process.cwd();

function walkJsFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsFiles(fullPath));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.js')) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function assertNoImportMatch({ files, pattern, errorLabel }) {
  const violations = [];

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8');
    if (!pattern.test(source)) {
      continue;
    }

    violations.push(relative(REPO_ROOT, filePath));
  }

  expect(violations, errorLabel).toEqual([]);
}

describe('architecture boundaries', () => {
  test('engine layer never imports game or app modules', () => {
    const engineFiles = walkJsFiles(join(REPO_ROOT, 'engine'));

    assertNoImportMatch({
      files: engineFiles,
      pattern: /from\s+['"][^'"]*(?:\/|\.\.\/)(?:app|game)\//,
      errorLabel: 'engine files must stay infra-only'
    });
  });

  test('game layer never imports app modules', () => {
    const gameFiles = walkJsFiles(join(REPO_ROOT, 'game'));

    assertNoImportMatch({
      files: gameFiles,
      pattern: /from\s+['"][^'"]*(?:\/|\.\.\/)app\//,
      errorLabel: 'game files must not depend on app layer'
    });
  });

  test('app runtime modules do not import each other directly', () => {
    const moduleFiles = walkJsFiles(join(REPO_ROOT, 'app/modules')).filter((filePath) => {
      const rel = relative(REPO_ROOT, filePath);
      if (rel.endsWith('.test.js')) {
        return false;
      }
      if (rel === 'app/modules/register-modules.js') {
        return false;
      }
      return true;
    });

    assertNoImportMatch({
      files: moduleFiles,
      pattern: /from\s+['"]\.\/(?!shared\/)[^'"]+\.js['"];/,
      errorLabel: 'runtime modules should communicate over bus events only'
    });
  });
});
