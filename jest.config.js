module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: 'test-reports',
            outputName: 'report.xml',
        }]
    ]
};