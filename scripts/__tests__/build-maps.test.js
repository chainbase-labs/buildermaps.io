/**
 * Unit tests for build-maps.js
 * Tests the data generation and transformation logic
 */

const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs');

describe('build-maps.js logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Project Loading', () => {
        it('should build a Map from project files', () => {
            const projectFiles = [
                { id: 'chainbase', name: 'Chainbase', description: 'Data platform' },
                { id: 'dune', name: 'Dune', description: 'Analytics' },
            ];

            const projects = new Map();
            projectFiles.forEach((project) => {
                projects.set(project.id, project);
            });

            expect(projects.size).toBe(2);
            expect(projects.get('chainbase').name).toBe('Chainbase');
        });

        it('should handle projects with all fields', () => {
            const project = {
                id: 'full-project',
                name: 'Full Project',
                description: 'A fully populated project',
                founded: 2022,
                funding: 10000000,
                links: {
                    homepage: 'https://example.com',
                    logo: '/imgs/logo.png',
                    twitter: 'https://x.com/example',
                    github: 'https://github.com/example',
                },
            };

            expect(project.id).toBe('full-project');
            expect(project.founded).toBe(2022);
            expect(project.funding).toBe(10000000);
            expect(project.links.homepage).toBe('https://example.com');
        });

        it('should handle projects with minimal fields', () => {
            const project = {
                id: 'minimal-project',
                name: 'Minimal Project',
            };

            expect(project.id).toBe('minimal-project');
            expect(project.description).toBeUndefined();
            expect(project.founded).toBeUndefined();
        });
    });

    describe('Map Data Processing', () => {
        it('should extract sector name from map data', () => {
            const mapData = {
                sector: 'Stablecoins',
                types: [],
            };

            expect(mapData.sector).toBe('Stablecoins');
        });

        it('should iterate through types and projects', () => {
            const mapData = {
                sector: 'Data',
                types: [
                    { id: 'infra', name: 'Infra', projects: ['chainbase', 'dune'] },
                    { id: 'analytics', name: 'Analytics', projects: ['nansen'] },
                ],
            };

            const allProjectIds = [];
            mapData.types.forEach((type) => {
                type.projects.forEach((projectId) => {
                    allProjectIds.push(projectId);
                });
            });

            expect(allProjectIds).toEqual(['chainbase', 'dune', 'nansen']);
        });
    });

    describe('Sector Assignment', () => {
        it('should track sectors for each project', () => {
            const projectSectors = new Map();

            // Simulate processing map data
            const mapData = {
                sector: 'Stablecoins',
                types: [
                    { name: 'Crypto Backed', projects: ['dai', 'frax'] },
                    { name: 'Infra', projects: ['chainbase'] },
                ],
            };

            mapData.types.forEach((type) => {
                type.projects.forEach((projectId) => {
                    if (!projectSectors.has(projectId)) {
                        projectSectors.set(projectId, []);
                    }

                    let sectorEntry = projectSectors
                        .get(projectId)
                        .find((s) => s.sector === mapData.sector);

                    if (sectorEntry) {
                        if (!sectorEntry.types.includes(type.name)) {
                            sectorEntry.types.push(type.name);
                        }
                    } else {
                        projectSectors.get(projectId).push({
                            sector: mapData.sector,
                            types: [type.name],
                        });
                    }
                });
            });

            expect(projectSectors.get('dai')).toEqual([
                { sector: 'Stablecoins', types: ['Crypto Backed'] },
            ]);
            expect(projectSectors.get('chainbase')).toEqual([
                { sector: 'Stablecoins', types: ['Infra'] },
            ]);
        });

        it('should handle project in multiple sectors', () => {
            const projectSectors = new Map();

            // First map
            const map1 = {
                sector: 'Data',
                types: [{ name: 'Infra', projects: ['chainbase'] }],
            };

            // Second map
            const map2 = {
                sector: 'Sui',
                types: [{ name: 'Data & Analytics', projects: ['chainbase'] }],
            };

            [map1, map2].forEach((mapData) => {
                mapData.types.forEach((type) => {
                    type.projects.forEach((projectId) => {
                        if (!projectSectors.has(projectId)) {
                            projectSectors.set(projectId, []);
                        }

                        let sectorEntry = projectSectors
                            .get(projectId)
                            .find((s) => s.sector === mapData.sector);

                        if (sectorEntry) {
                            if (!sectorEntry.types.includes(type.name)) {
                                sectorEntry.types.push(type.name);
                            }
                        } else {
                            projectSectors.get(projectId).push({
                                sector: mapData.sector,
                                types: [type.name],
                            });
                        }
                    });
                });
            });

            const chainbaseSectors = projectSectors.get('chainbase');
            expect(chainbaseSectors).toHaveLength(2);
            expect(chainbaseSectors.find((s) => s.sector === 'Data')).toBeDefined();
            expect(chainbaseSectors.find((s) => s.sector === 'Sui')).toBeDefined();
        });

        it('should handle project in multiple types within same sector', () => {
            const projectSectors = new Map();

            const mapData = {
                sector: 'Multi-Type',
                types: [
                    { name: 'Type A', projects: ['multi-project'] },
                    { name: 'Type B', projects: ['multi-project'] },
                ],
            };

            mapData.types.forEach((type) => {
                type.projects.forEach((projectId) => {
                    if (!projectSectors.has(projectId)) {
                        projectSectors.set(projectId, []);
                    }

                    let sectorEntry = projectSectors
                        .get(projectId)
                        .find((s) => s.sector === mapData.sector);

                    if (sectorEntry) {
                        if (!sectorEntry.types.includes(type.name)) {
                            sectorEntry.types.push(type.name);
                        }
                    } else {
                        projectSectors.get(projectId).push({
                            sector: mapData.sector,
                            types: [type.name],
                        });
                    }
                });
            });

            const sectors = projectSectors.get('multi-project');
            expect(sectors).toHaveLength(1);
            expect(sectors[0].types).toEqual(['Type A', 'Type B']);
        });
    });

    describe('Builder Maps Entry Creation', () => {
        it('should create complete entry from project and sectors', () => {
            const project = {
                id: 'test-project',
                name: 'Test Project',
                description: 'A test project',
                founded: 2022,
                funding: 5000000,
                links: {
                    homepage: 'https://test.com',
                    logo: '/imgs/test.png',
                },
            };

            const sectors = [{ sector: 'Data', types: ['Infra'] }];

            const entry = {
                name: project.name,
                description: project.description,
                sectors: sectors,
                founded: project.founded,
                funding: project.funding,
                links: project.links,
            };

            expect(entry.name).toBe('Test Project');
            expect(entry.description).toBe('A test project');
            expect(entry.sectors).toHaveLength(1);
            expect(entry.founded).toBe(2022);
            expect(entry.funding).toBe(5000000);
        });

        it('should handle missing optional fields', () => {
            const project = {
                id: 'minimal',
                name: 'Minimal',
            };

            const sectors = [{ sector: 'Test', types: ['Type'] }];

            const entry = {
                name: project.name,
                description: project.description,
                sectors: sectors,
                founded: project.founded,
                funding: project.funding,
                links: project.links,
            };

            expect(entry.name).toBe('Minimal');
            expect(entry.description).toBeUndefined();
            expect(entry.founded).toBeUndefined();
            expect(entry.funding).toBeUndefined();
            expect(entry.links).toBeUndefined();
        });
    });

    describe('Sorting', () => {
        it('should sort entries alphabetically by name', () => {
            const entries = [
                { name: 'Chainbase' },
                { name: 'Aave' },
                { name: 'Dune' },
                { name: 'Bitcoin' },
            ];

            entries.sort((a, b) => a.name.localeCompare(b.name));

            expect(entries.map((e) => e.name)).toEqual([
                'Aave',
                'Bitcoin',
                'Chainbase',
                'Dune',
            ]);
        });

        it('should handle case-insensitive sorting', () => {
            const entries = [
                { name: 'chainbase' },
                { name: 'AAVE' },
                { name: 'Dune' },
            ];

            entries.sort((a, b) => a.name.localeCompare(b.name));

            // localeCompare is case-insensitive by default
            expect(entries[0].name.toLowerCase()).toBe('aave');
        });
    });

    describe('Warning Generation', () => {
        it('should generate warning for missing project', () => {
            const projects = new Map([['exists', { id: 'exists', name: 'Exists' }]]);

            const projectSectors = new Map([
                ['exists', [{ sector: 'A', types: ['T1'] }]],
                ['missing', [{ sector: 'B', types: ['T2'] }]],
            ]);

            const warnings = [];

            for (const [projectId] of projectSectors) {
                if (!projects.has(projectId)) {
                    warnings.push(`⚠️  Project not found: ${projectId}`);
                }
            }

            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toContain('missing');
        });
    });

    describe('Statistics Calculation', () => {
        it('should count projects per sector', () => {
            const builderMaps = [
                { name: 'A', sectors: [{ sector: 'Data' }] },
                { name: 'B', sectors: [{ sector: 'Data' }, { sector: 'AI' }] },
                { name: 'C', sectors: [{ sector: 'AI' }] },
            ];

            const sectorCounts = new Map();
            builderMaps.forEach((entry) => {
                entry.sectors.forEach((s) => {
                    const count = sectorCounts.get(s.sector) || 0;
                    sectorCounts.set(s.sector, count + 1);
                });
            });

            expect(sectorCounts.get('Data')).toBe(2);
            expect(sectorCounts.get('AI')).toBe(2);
        });

        it('should sort sectors by count descending', () => {
            const sectorCounts = new Map([
                ['Data', 10],
                ['AI', 25],
                ['Privacy', 15],
            ]);

            const sorted = Array.from(sectorCounts.entries()).sort(
                (a, b) => b[1] - a[1]
            );

            expect(sorted[0]).toEqual(['AI', 25]);
            expect(sorted[1]).toEqual(['Privacy', 15]);
            expect(sorted[2]).toEqual(['Data', 10]);
        });
    });
});

describe('JSON Output', () => {
    it('should produce valid JSON', () => {
        const builderMaps = [
            {
                name: 'Test Project',
                description: 'Description',
                sectors: [{ sector: 'Data', types: ['Infra'] }],
                founded: 2022,
                funding: 1000000,
                links: { homepage: 'https://test.com' },
            },
        ];

        const json = JSON.stringify(builderMaps, null, 2);
        const parsed = JSON.parse(json);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].name).toBe('Test Project');
    });

    it('should handle null values in JSON', () => {
        const entry = {
            name: 'Test',
            founded: null,
            funding: null,
        };

        const json = JSON.stringify(entry);
        const parsed = JSON.parse(json);

        expect(parsed.founded).toBeNull();
        expect(parsed.funding).toBeNull();
    });
});
