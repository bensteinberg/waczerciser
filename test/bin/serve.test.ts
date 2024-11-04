import { jest, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { serveCommand } from '../../src/bin/serve.js';
import { startServer } from '../../src/lib/serve.js';
import { watchAndCreate } from '../../src/lib/create.js';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../src/lib/serve.js');
jest.mock('../../src/lib/create.js');
jest.mock('./utils.js');

describe('serveCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should serve existing archive file directly', async () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.lstatSync.mockReturnValue({ isDirectory: () => false } as fs.Stats);
    
    await serveCommand('archive.wacz', { port: '8080', url: '' });

    expect(startServer).toHaveBeenCalledWith('archive.wacz', '', 8080);
  });

  it('should create and serve from directory with auto-detected WACZ format', async () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.lstatSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
    mockFs.existsSync.mockImplementation((p) => 
      path.basename(p as string) === 'datapackage.json'
    );
    mockFs.promises.mkdtemp.mockResolvedValue('/tmp/test');

    await serveCommand('input-dir', { port: '8080', url: '' });

    expect(watchAndCreate).toHaveBeenCalled();
    expect(startServer).toHaveBeenCalled();
  });

  it('should respect format option when serving directory', async () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.lstatSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
    mockFs.promises.mkdtemp.mockResolvedValue('/tmp/test');

    await serveCommand('input-dir', { 
      port: '8080', 
      url: '', 
      format: 'wacz' 
    });

    expect(watchAndCreate).toHaveBeenCalled();
    expect(startServer).toHaveBeenCalled();
  });
}); 