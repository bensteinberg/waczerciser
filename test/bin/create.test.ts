import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach } from 'node:test';
import { FSWatcher } from 'chokidar';

describe('createCommand', async () => {
    const createArchiveMock = mock.fn();
    const watchAndCreateMock = mock.fn();
    const exitMock = mock.fn();
    let createCommand: any;

    beforeEach(async () => {
        // Mock the dependencies
        mock.module('../lib/create.js', {
            createArchive: createArchiveMock,
            watchAndCreate: watchAndCreateMock
        });

        mock.module('./utils.js', {
            exit: exitMock
        });

        // Dynamic import of the module under test
        const module = await import('../../src/bin/create.js');
        createCommand = module.createCommand;
    });

    it('should create archive in normal mode', async () => {
        const inputDir = './input';
        const outputFile = './output.zip';
        
        await createCommand(inputDir, outputFile, { watch: false });

        assert.equal(createArchiveMock.mock.calls.length, 1);
        assert.deepEqual(createArchiveMock.mock.calls[0].arguments, [
            inputDir,
            outputFile,
            undefined
        ]);
        assert.equal(exitMock.mock.calls.length, 1);
    });

    it('should watch and create in watch mode', async () => {
        const inputDir = './input';
        const outputFile = './output.zip';
        const mockWatcher = new FSWatcher();
        
        watchAndCreateMock.mockImplementation(() => Promise.resolve(mockWatcher));

        await createCommand(inputDir, outputFile, { watch: true });

        assert.equal(watchAndCreateMock.mock.calls.length, 1);
        assert.deepEqual(watchAndCreateMock.mock.calls[0].arguments, [
            inputDir,
            outputFile,
            undefined
        ]);
        
        // Test cleanup handler
        const events = process.listeners('SIGINT');
        assert.equal(events.length, 1);
    });
}); 