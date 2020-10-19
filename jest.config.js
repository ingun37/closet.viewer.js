module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: 'test-reports',
            outputName: 'report.xml',
        }],
        // '<rootDir>/metric-reporter/metric-reporter.js'
    ],
    // globalSetup: '<rootDir>/metric-reporter/setup.js'

    setupFilesAfterEnv: ['<rootDir>/metric-reporter/setup.js']
};