import type { Config } from 'jest';

// list of patterns for which no transformation/transpiling should be made
const ignoredModulePatterns: string = ['d3-.*', '(.*.mjs$)'].join('|');
// list of patterns excluded by testing/coverage (default: node_modules)
const ignoredPathPatterns: string[] = [
  '<rootDir>/libs/custom-auth/lib/pre_loaders/',
  '<rootDir>/libs/custom-auth/src/lib/main.ts',
  '<rootDir>/libs/custom-auth/src/lib/bootstrap.ts',
  '<rootDir>/libs/custom-auth/src/lib/scope-polyfill',
  '<rootDir>/libs/custom-auth/src/lib/shared/generated',
];

const config: Config = {
  displayName: 'onecx-service-auth-ui',
  silent: true,
  verbose: false,
  testEnvironment: 'jsdom',
  preset: './jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/libs/custom-auth/src/test-setup.ts'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  testMatch: ['<rootDir>/libs/custom-auth/src/lib/*.spec.ts'],
  testPathIgnorePatterns: ignoredPathPatterns,
  // transformation
  moduleNameMapper: {
    '@primeng/themes': '<rootDir>/node_modules/@primeng/themes/index.mjs',
  },
  transformIgnorePatterns: [`node_modules/(?!${ignoredModulePatterns})`],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  // reporting
  collectCoverage: true,
  coverageDirectory: '<rootDir>/reports/coverage/',
  coveragePathIgnorePatterns: ignoredPathPatterns,
  coverageReporters: ['json', 'text', 'lcov', 'text-summary'],
  testResultsProcessor: 'jest-sonar-reporter',
  reporters: [
    'default',
    [
      'jest-sonar',
      {
        outputDirectory: 'reports',
        outputName: 'sonarqube_report.xml',
        reportedFilePath: 'absolute',
      },
    ],
  ],
};

export default config;
