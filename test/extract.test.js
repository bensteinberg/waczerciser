import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractArchive } from '../src/lib/extract.ts';
import path from 'path';
import { withTempDir, FIXTURES_DIR, globDir } from './helpers.ts';


test('extract.extractArchive', async (t) => {

  await t.test('extracts WARC file', withTempDir(async (tempDir) => {
    const inputFile = path.join(FIXTURES_DIR, 'example.warc.gz');
    const outputDir = path.join(tempDir, 'output');
    await extractArchive(inputFile, outputDir);
    assert.deepEqual(await globDir(outputDir), [
      'example.warc',
      'file:',
      'file:/dom-snapshot.html',
      'file:/pdf-snapshot.pdf',
      'file:/provenance-summary.html',
      'file:/screenshot.png',
      'http:',
      'http:/com,example)',
      'http:/com,example)/__index__.html',
      'http:/com,example)/favicon.ico'
    ]);
  }));

  await t.test('extracts WACZ file', withTempDir(async (tempDir) => {
    const inputFile = path.join(FIXTURES_DIR, 'example.wacz');
    const outputDir = path.join(tempDir, 'output');
    await extractArchive(inputFile, outputDir);
    assert.deepEqual(await globDir(outputDir), [
      'archive',
      'archive/data',
      'archive/data.warc.gz',
      'archive/data/data.warc',
      'archive/data/file:',
      'archive/data/file:/dom-snapshot.html',
      'archive/data/file:/pdf-snapshot.pdf',
      'archive/data/file:/provenance-summary.html',
      'archive/data/file:/screenshot.png',
      'archive/data/http:',
      'archive/data/http:/com,example)',
      'archive/data/http:/com,example)/__index__.html',
      'archive/data/http:/com,example)/favicon.ico',
      'datapackage-digest.json',
      'datapackage.json',
      'indexes',
      'indexes/index.cdx',
      'pages',
      'pages/pages.jsonl'
    ]);
  }));

  await t.test('throws on invalid file type', async () => {
    await assert.rejects(
      extractArchive('invalid.txt', 'output'),
      {message: 'Unknown file type. Supported formats: .wacz, .warc, .warc.gz'},
    );
  });
}); 
