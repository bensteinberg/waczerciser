import { jest } from '@jest/globals';
import fs from 'fs';
import { extractCommand } from '../../src/bin/extract.ts';
import { extractArchive } from '../../src/lib/extract.ts';
import { hasFiles } from '../../src/lib/utils.ts';

// Mock dependencies
jest.mock('fs');
jest.mock('../../src/lib/extract.ts');
jest.mock('../../src/lib/utils.ts');

describe('extractCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract archive when output directory is empty', async () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => false } as fs.Stats);
    jest.mocked(hasFiles).mockResolvedValue(false);

    await extractCommand('input.wacz', 'output', {});

    expect(extractArchive).toHaveBeenCalledWith('input.wacz', 'output');
  });

  it('should fail if output path is a file', async () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => true } as fs.Stats);

    await extractCommand('input.wacz', 'output.txt', {});

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should delete existing directory when deleteExisting flag is true', async () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    mockFs.existsSync.mockReturnValue(true);
    mockFs.lstatSync.mockReturnValue({ isFile: () => false } as fs.Stats);
    jest.mocked(hasFiles).mockResolvedValue(true);

    await extractCommand('input.wacz', 'output', { deleteExisting: true });

    expect(mockFs.rmSync).toHaveBeenCalledWith('output', { recursive: true, force: true });
    expect(extractArchive).toHaveBeenCalledWith('input.wacz', 'output');
  });
}); 