/**
 * Unit tests for image-fallback.ts
 * Tests the image URL transformation functions for different environments
 */

import { getProductionImageUrl, getLocalhostFallback } from './image-fallback';

// ============================================================================
// Helper to mock window.location
// ============================================================================

function mockWindowLocation(hostname: string, pathname: string) {
    Object.defineProperty(window, 'location', {
        writable: true,
        value: {
            hostname,
            pathname,
            href: `https://${hostname}${pathname}`,
        },
    });
}

// ============================================================================
// getProductionImageUrl tests
// ============================================================================

describe('getProductionImageUrl', () => {
    describe('when NOT on net-static-dev.chainbasehq.com/buildermaps', () => {
        beforeEach(() => {
            mockWindowLocation('localhost', '/');
        });

        it('should return original URL for relative paths', () => {
            const url = '/imgs/chainbase.png';
            expect(getProductionImageUrl(url)).toBe(url);
        });

        it('should return original URL for full URLs', () => {
            const url = 'https://example.com/logo.png';
            expect(getProductionImageUrl(url)).toBe(url);
        });

        it('should return original URL when only hostname matches but not path', () => {
            mockWindowLocation('net-static-dev.chainbasehq.com', '/other-app');
            const url = '/imgs/test.png';
            expect(getProductionImageUrl(url)).toBe(url);
        });

        it('should return original URL when on different hostname', () => {
            mockWindowLocation('example.com', '/buildermaps');
            const url = '/imgs/test.png';
            expect(getProductionImageUrl(url)).toBe(url);
        });
    });

    describe('when ON net-static-dev.chainbasehq.com/buildermaps', () => {
        beforeEach(() => {
            mockWindowLocation('net-static-dev.chainbasehq.com', '/buildermaps');
        });

        it('should transform relative /imgs/ paths to full production URL', () => {
            const url = '/imgs/chainbase.png';
            expect(getProductionImageUrl(url)).toBe(
                'https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/chainbase.png'
            );
        });

        it('should transform nested /imgs/ paths correctly', () => {
            const url = '/imgs/Sui/Analytics/Chainbase.png';
            expect(getProductionImageUrl(url)).toBe(
                'https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/Sui/Analytics/Chainbase.png'
            );
        });

        it('should return full URLs unchanged', () => {
            const url = 'https://example.com/logo.png';
            expect(getProductionImageUrl(url)).toBe(url);
        });

        it('should return non-/imgs/ paths unchanged', () => {
            const url = '/other/path/image.png';
            expect(getProductionImageUrl(url)).toBe(url);
        });

        it('should handle /buildermaps sub-paths', () => {
            mockWindowLocation('net-static-dev.chainbasehq.com', '/buildermaps/category/stablecoins');
            const url = '/imgs/test.png';
            expect(getProductionImageUrl(url)).toBe(
                'https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/test.png'
            );
        });
    });
});

// ============================================================================
// getLocalhostFallback tests
// ============================================================================

describe('getLocalhostFallback', () => {
    describe('when NOT on net-static-dev.chainbasehq.com/buildermaps', () => {
        beforeEach(() => {
            mockWindowLocation('localhost', '/');
        });

        it('should return null for any URL', () => {
            expect(getLocalhostFallback('/imgs/test.png')).toBeNull();
            expect(getLocalhostFallback('https://example.com/logo.png')).toBeNull();
        });

        it('should return null when only hostname matches', () => {
            mockWindowLocation('net-static-dev.chainbasehq.com', '/other');
            expect(getLocalhostFallback('/imgs/test.png')).toBeNull();
        });
    });

    describe('when ON net-static-dev.chainbasehq.com/buildermaps', () => {
        beforeEach(() => {
            mockWindowLocation('net-static-dev.chainbasehq.com', '/buildermaps');
        });

        it('should return localhost fallback for production buildermaps URL', () => {
            const url = 'https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/test.png';
            expect(getLocalhostFallback(url)).toBe('http://localhost:8080/imgs/test.png');
        });

        it('should return localhost fallback for nested production URL', () => {
            const url = 'https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/Sui/DeFi/logo.png';
            expect(getLocalhostFallback(url)).toBe('http://localhost:8080/imgs/Sui/DeFi/logo.png');
        });

        it('should return localhost fallback for relative /imgs/ path', () => {
            const url = '/imgs/chainbase.png';
            expect(getLocalhostFallback(url)).toBe('http://localhost:8080/imgs/chainbase.png');
        });

        it('should return null for non-matching URLs', () => {
            expect(getLocalhostFallback('https://example.com/logo.png')).toBeNull();
            expect(getLocalhostFallback('/other/path.png')).toBeNull();
        });

        it('should handle case-insensitive URL matching', () => {
            const url = 'HTTPS://NET-STATIC-DEV.CHAINBASEHQ.COM/public/buildermaps/imgs/test.png';
            expect(getLocalhostFallback(url)).toBe('http://localhost:8080/imgs/test.png');
        });
    });
});

// ============================================================================
// Edge cases
// ============================================================================

describe('Edge cases', () => {
    beforeEach(() => {
        mockWindowLocation('net-static-dev.chainbasehq.com', '/buildermaps');
    });

    it('should handle empty strings', () => {
        expect(getProductionImageUrl('')).toBe('');
        expect(getLocalhostFallback('')).toBeNull();
    });

    it('should handle URLs with special characters', () => {
        const url = '/imgs/project%20name.png';
        expect(getProductionImageUrl(url)).toBe(
            'https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/project%20name.png'
        );
    });

    it('should handle URLs with query parameters', () => {
        const url = '/imgs/logo.png?v=123';
        expect(getProductionImageUrl(url)).toBe(
            'https://net-static-dev.chainbasehq.com/public/buildermaps/imgs/logo.png?v=123'
        );
    });
});
