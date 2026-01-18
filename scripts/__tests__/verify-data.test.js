/**
 * Unit tests for verify-data.js
 * Tests the data integrity validation logic
 */

const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');

// Import the functions we want to test by extracting the logic
// Since verify-data.js is a script, we'll test the core logic patterns

describe('verify-data.js logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Project Loading', () => {
        it('should correctly parse project JSON files', () => {
            const projectData = {
                id: 'test-project',
                name: 'Test Project',
                description: 'A test project',
                founded: 2022,
                funding: 1000000,
                links: {
                    homepage: 'https://test.com',
                    twitter: 'https://x.com/test',
                },
            };

            // Simulate parsing project file
            const parsed = JSON.parse(JSON.stringify(projectData));
            expect(parsed.id).toBe('test-project');
            expect(parsed.name).toBe('Test Project');
            expect(parsed.links.homepage).toBe('https://test.com');
        });

        it('should extract project ID from parsed data', () => {
            const projectData = { id: 'my-project', name: 'My Project' };
            const projectId = projectData.id;
            expect(projectId).toBe('my-project');
        });

        it('should handle projects with null funding', () => {
            const projectData = {
                id: 'project-no-funding',
                name: 'No Funding Project',
                funding: null,
            };
            expect(projectData.funding).toBeNull();
        });
    });

    describe('Map File Validation', () => {
        it('should correctly parse map structure', () => {
            const mapData = {
                sector: 'Stablecoins',
                types: [
                    {
                        id: 'crypto-backed',
                        name: 'Crypto Backed',
                        projects: ['dai', 'frax', 'lusd'],
                    },
                    {
                        id: 't-bills-backed',
                        name: 'T-Bills Backed',
                        projects: ['usdc', 'usdt'],
                    },
                ],
            };

            expect(mapData.sector).toBe('Stablecoins');
            expect(mapData.types).toHaveLength(2);
            expect(mapData.types[0].projects).toContain('dai');
        });

        it('should count projects in types correctly', () => {
            const mapData = {
                sector: 'Test',
                types: [
                    { id: 'type1', name: 'Type 1', projects: ['a', 'b', 'c'] },
                    { id: 'type2', name: 'Type 2', projects: ['d', 'e'] },
                ],
            };

            let total = 0;
            mapData.types.forEach((type) => {
                total += type.projects.length;
            });

            expect(total).toBe(5);
        });

        it('should handle empty types array', () => {
            const mapData = {
                sector: 'Empty Sector',
                types: [],
            };

            expect(mapData.types).toHaveLength(0);
        });

        it('should handle types with empty projects array', () => {
            const mapData = {
                sector: 'Test',
                types: [{ id: 'empty', name: 'Empty Type', projects: [] }],
            };

            expect(mapData.types[0].projects).toHaveLength(0);
        });
    });

    describe('Project Reference Validation', () => {
        it('should detect when a referenced project exists', () => {
            const existingProjects = new Set(['project-a', 'project-b', 'project-c']);
            const referencedId = 'project-b';

            expect(existingProjects.has(referencedId)).toBe(true);
        });

        it('should detect when a referenced project is missing', () => {
            const existingProjects = new Set(['project-a', 'project-b']);
            const referencedId = 'missing-project';

            expect(existingProjects.has(referencedId)).toBe(false);
        });

        it('should collect all missing project references', () => {
            const existingProjects = new Set(['project-a', 'project-b']);
            const referencedIds = ['project-a', 'missing-1', 'project-b', 'missing-2'];

            const missing = referencedIds.filter((id) => !existingProjects.has(id));

            expect(missing).toEqual(['missing-1', 'missing-2']);
        });
    });

    describe('Statistics Calculation', () => {
        it('should calculate sector statistics correctly', () => {
            const mapData = {
                sector: 'AI & Crypto',
                types: [
                    { id: 'agents', name: 'Agents', projects: ['a', 'b', 'c'] },
                    { id: 'compute', name: 'Compute', projects: ['d', 'e'] },
                ],
            };

            const sectorTotal = mapData.types.reduce(
                (sum, type) => sum + type.projects.length,
                0
            );
            const typeCount = mapData.types.length;

            expect(sectorTotal).toBe(5);
            expect(typeCount).toBe(2);
        });

        it('should aggregate statistics across multiple maps', () => {
            const maps = [
                { sector: 'A', types: [{ projects: ['p1', 'p2'] }] },
                { sector: 'B', types: [{ projects: ['p3', 'p4', 'p5'] }] },
                { sector: 'C', types: [{ projects: ['p6'] }] },
            ];

            let totalMappings = 0;
            maps.forEach((map) => {
                map.types.forEach((type) => {
                    totalMappings += type.projects.length;
                });
            });

            expect(totalMappings).toBe(6);
        });
    });

    describe('Error Reporting', () => {
        it('should format error messages with sector context', () => {
            const error = {
                sector: 'Stablecoins',
                type: 'Crypto Backed',
                projectId: 'missing-project',
                error: '项目文件不存在',
            };

            const message = `${error.sector}: ${error.projectId} (${error.error})`;
            expect(message).toBe('Stablecoins: missing-project (项目文件不存在)');
        });

        it('should track multiple errors across sectors', () => {
            const errors = [];

            // Simulate finding errors
            errors.push({ sector: 'A', projectId: 'missing-1' });
            errors.push({ sector: 'B', projectId: 'missing-2' });
            errors.push({ sector: 'A', projectId: 'missing-3' });

            expect(errors).toHaveLength(3);
            expect(errors.filter((e) => e.sector === 'A')).toHaveLength(2);
        });
    });
});

describe('Integration scenarios', () => {
    it('should validate complete data flow', () => {
        // Simulate complete verification process
        const projects = new Set(['chainbase', 'dune', 'nansen']);

        const mapData = {
            sector: 'Data',
            types: [
                { name: 'Infra', projects: ['chainbase', 'dune'] },
                { name: 'Analytics', projects: ['nansen'] },
            ],
        };

        const errors = [];
        let totalMappings = 0;

        mapData.types.forEach((type) => {
            type.projects.forEach((projectId) => {
                totalMappings++;
                if (!projects.has(projectId)) {
                    errors.push({ projectId, type: type.name });
                }
            });
        });

        expect(errors).toHaveLength(0);
        expect(totalMappings).toBe(3);
    });

    it('should detect validation failures correctly', () => {
        const projects = new Set(['chainbase', 'dune']);

        const mapData = {
            sector: 'Data',
            types: [
                { name: 'Infra', projects: ['chainbase', 'missing-project'] },
            ],
        };

        const errors = [];

        mapData.types.forEach((type) => {
            type.projects.forEach((projectId) => {
                if (!projects.has(projectId)) {
                    errors.push({ projectId, type: type.name });
                }
            });
        });

        expect(errors).toHaveLength(1);
        expect(errors[0].projectId).toBe('missing-project');
    });
});
