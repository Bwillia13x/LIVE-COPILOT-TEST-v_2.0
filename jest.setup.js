// Mock Vite's import.meta.env for Jest environments
global.import = {
  meta: {
    env: {
      VITE_GEMINI_API_KEY: 'mock-api-key', // Provide a mock API key or other needed vars
      // Add other VITE_ variables your app uses here
    },
  },
};
