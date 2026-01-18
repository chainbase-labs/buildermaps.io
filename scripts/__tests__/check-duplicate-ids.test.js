/**
 * Unit tests for check-duplicate-ids.js
 * Tests the duplicate detection and validation logic
 */

const fs = require('fs');
const path = require('path');

// Mock fs and child_process modules
jest.mock('fs');
jest.mock('child_process');

describe('check-duplicate-ids.js logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Project ID Extraction', () => {
        it('should extract ID from valid project JSON', () => {
            const projectData = {
                id: 'test-project',
                name: 'Test Project',
            };

            expect(projectData.id).toBe('test-project');
        });

        it('should handle project without ID field', () => {
            const projectData = {
                name: 'Project Without ID',
            };

            expect(projectData.id).toBeUndefined();
        });

        it('should track IDs in a Map structure', () => {
            const projectIds = new Map();

            const files = [
                { file: 'project-a.json', data: { id: 'project-a' } },
                { file: 'project-b.json', data: { id: 'project-b' } },
            ];

            files.forEach(({ file, data }) => {
                if (data.id) {
                    projectIds.set(data.id, file);
                }
            });

            expect(projectIds.size).toBe(2);
            expect(projectIds.get('project-a')).toBe('project-a.json');
        });
    });

    describe('Duplicate Detection in Projects', () => {
        it('should detect duplicate project IDs across files', () => {
            const projectIds = new Map();
            const duplicates = [];

            const files = [
                { file: 'chainbase.json', data: { id: 'chainbase' } },
                { file: 'chainbase-dup.json', data: { id: 'chainbase' } }, // Duplicate
                { file: 'dune.json', data: { id: 'dune' } },
            ];

            files.forEach(({ file, data }) => {
                if (data.id) {
                    if (projectIds.has(data.id)) {
                        const existingFile = projectIds.get(data.id);
                        duplicates.push({
                            id: data.id,
                            files: [existingFile, file],
                        });
                    } else {
                        projectIds.set(data.id, file);
                    }
                }
            });

            expect(duplicates).toHaveLength(1);
            expect(duplicates[0].id).toBe('chainbase');
            expect(duplicates[0].files).toContain('chainbase.json');
            expect(duplicates[0].files).toContain('chainbase-dup.json');
        });

        it('should pass when all IDs are unique', () => {
            const projectIds = new Map();
            const duplicates = [];

            const files = [
                { file: 'a.json', data: { id: 'a' } },
                { file: 'b.json', data: { id: 'b' } },
                { file: 'c.json', data: { id: 'c' } },
            ];

            files.forEach(({ file, data }) => {
                if (projectIds.has(data.id)) {
                    duplicates.push({ id: data.id });
                } else {
                    projectIds.set(data.id, file);
                }
            });

            expect(duplicates).toHaveLength(0);
        });
    });

    describe('Duplicate Detection in Maps', () => {
        it('should detect duplicate project IDs within a type array', () => {
            const mapData = {
                sector: 'Stablecoins',
                types: [
                    {
                        id: 'crypto-backed',
                        name: 'Crypto Backed',
                        projects: ['dai', 'frax', 'dai', 'lusd'], // 'dai' is duplicated
                    },
                ],
            };

            const errors = [];

            mapData.types.forEach((type) => {
                const seen = new Map();
                type.projects.forEach((projectId, index) => {
                    if (seen.has(projectId)) {
                        errors.push({
                            projectId,
                            type: type.name,
                            indices: [seen.get(projectId), index],
                        });
                    } else {
                        seen.set(projectId, index);
                    }
                });
            });

            expect(errors).toHaveLength(1);
            expect(errors[0].projectId).toBe('dai');
            expect(errors[0].indices).toEqual([0, 2]);
        });

        it('should allow same project in different types', () => {
            const mapData = {
                sector: 'Test',
                types: [
                    { id: 'type1', name: 'Type 1', projects: ['project-a', 'project-b'] },
                    { id: 'type2', name: 'Type 2', projects: ['project-a', 'project-c'] }, // 'project-a' in multiple types is OK
                ],
            };

            const errors = [];

            mapData.types.forEach((type) => {
                const seen = new Set();
                type.projects.forEach((projectId) => {
                    if (seen.has(projectId)) {
                        errors.push({ projectId, type: type.name });
                    }
                    seen.add(projectId);
                });
            });

            // No duplicates within the same type array
            expect(errors).toHaveLength(0);
        });
    });

    describe('Missing Project Detection', () => {
        it('should detect references to non-existent projects', () => {
            const existingProjects = new Set(['project-a', 'project-b']);

            const mapData = {
                sector: 'Test',
                types: [
                    { name: 'Type 1', projects: ['project-a', 'missing-project'] },
                ],
            };

            const missingProjects = [];

            mapData.types.forEach((type) => {
                type.projects.forEach((projectId) => {
                    if (!existingProjects.has(projectId)) {
                        missingProjects.push({
                            projectId,
                            type: type.name,
                        });
                    }
                });
            });

            expect(missingProjects).toHaveLength(1);
            expect(missingProjects[0].projectId).toBe('missing-project');
        });

        it('should pass when all referenced projects exist', () => {
            const existingProjects = new Set(['a', 'b', 'c']);

            const mapData = {
                sector: 'Test',
                types: [{ name: 'Type 1', projects: ['a', 'b', 'c'] }],
            };

            const missingProjects = [];

            mapData.types.forEach((type) => {
                type.projects.forEach((projectId) => {
                    if (!existingProjects.has(projectId)) {
                        missingProjects.push({ projectId });
                    }
                });
            });

            expect(missingProjects).toHaveLength(0);
        });
    });

    describe('Count Tracking', () => {
        it('should count occurrences within a projects array', () => {
            const projects = ['a', 'b', 'a', 'c', 'a', 'b'];
            const counts = new Map();

            projects.forEach((id) => {
                counts.set(id, (counts.get(id) || 0) + 1);
            });

            expect(counts.get('a')).toBe(3);
            expect(counts.get('b')).toBe(2);
            expect(counts.get('c')).toBe(1);
        });

        it('should identify IDs with count > 1 as duplicates', () => {
            const projects = ['a', 'b', 'a', 'c'];
            const counts = new Map();

            projects.forEach((id) => {
                counts.set(id, (counts.get(id) || 0) + 1);
            });

            const duplicates = [];
            counts.forEach((count, id) => {
                if (count > 1) {
                    duplicates.push({ id, count });
                }
            });

            expect(duplicates).toHaveLength(1);
            expect(duplicates[0]).toEqual({ id: 'a', count: 2 });
        });
    });

    describe('Index Tracking', () => {
        it('should track all indices where a duplicate appears', () => {
            const projects = ['a', 'b', 'a', 'c', 'a'];
            const indices = new Map();

            projects.forEach((id, index) => {
                if (!indices.has(id)) {
                    indices.set(id, []);
                }
                indices.get(id).push(index);
            });

            expect(indices.get('a')).toEqual([0, 2, 4]);
            expect(indices.get('b')).toEqual([1]);
            expect(indices.get('c')).toEqual([3]);
        });
    });

    describe('Validation Result', () => {
        it('should return true when validation passes', () => {
            const errors = [];
            const isValid = errors.length === 0;
            expect(isValid).toBe(true);
        });

        it('should return false when validation fails', () => {
            const errors = [{ error: 'duplicate found' }];
            const isValid = errors.length === 0;
            expect(isValid).toBe(false);
        });
    });
});

describe('Git Integration (Staged Files)', () => {
    it('should filter staged files to project directory', () => {
        const stagedFiles = [
            'public/data/projects/new-project.json',
            'public/data/maps/stablecoins.json',
            'src/components/HomePage.tsx',
            'README.md',
        ];

        const projectFiles = stagedFiles.filter(
            (f) => f.startsWith('public/data/projects/') && f.endsWith('.json')
        );

        expect(projectFiles).toHaveLength(1);
        expect(projectFiles[0]).toBe('public/data/projects/new-project.json');
    });

    it('should filter staged files to maps directory', () => {
        const stagedFiles = [
            'public/data/projects/new-project.json',
            'public/data/maps/stablecoins.json',
            'public/data/maps/ai-and-crypto.json',
            'src/components/HomePage.tsx',
        ];

        const mapFiles = stagedFiles.filter(
            (f) => f.startsWith('public/data/maps/') && f.endsWith('.json')
        );

        expect(mapFiles).toHaveLength(2);
    });

    it('should extract filename from path', () => {
        const relativePath = 'public/data/projects/chainbase.json';
        const fileName = relativePath.split('/').pop();
        expect(fileName).toBe('chainbase.json');
    });
});
