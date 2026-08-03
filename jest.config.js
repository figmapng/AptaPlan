module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^expo-file-system$': '<rootDir>/src/services/__mocks__/expo-file-system.js',
    '^expo-sharing$': '<rootDir>/src/services/__mocks__/expo-sharing.js',
    '^expo-document-picker$': '<rootDir>/src/services/__mocks__/expo-document-picker.js',
  },
};
