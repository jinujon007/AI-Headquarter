module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // core has no tests since the dead fork TaskManager (+ its test) was removed
    passWithNoTests: true,
};
