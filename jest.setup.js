// Jest setup file
// Mock browser APIs that are not available in jsdom

// Mock window.location for image fallback tests
Object.defineProperty(window, "location", {
  writable: true,
  value: {
    hostname: "localhost",
    pathname: "/",
    href: "http://localhost:8080/",
  },
});

// Suppress console output during tests (optional - comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
