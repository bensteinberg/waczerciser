import { test } from "node:test";
import assert from "node:assert/strict";
import { createArchive } from "../../src/lib/create.ts";
import { extractArchive } from "../../src/lib/extract.ts";
import path from "path";
import { withTempDir, FIXTURES_DIR, globDir } from "../helpers.ts";
import fs from "fs";
import { WARCParser } from "warcio";

test("create.createArchive", async (t) => {
	await t.test(
		"creates WARC file",
		withTempDir(async (tempDir) => {
			const inputFile = path.join(FIXTURES_DIR, "example.warc.gz");
			const outputDir = path.join(tempDir, "output");
			const outputFile = path.join(tempDir, "output.warc.gz");
			await extractArchive(inputFile, outputDir);
			await createArchive(outputDir, outputFile);

			// list contents with warcio.js
			const parser = new WARCParser(fs.createReadStream(outputFile));
			const records = [];
			for await (const record of parser) {
				records.push({
					type: record.warcType,
					url: record.warcTargetURI,
				});
			}

			assert.deepEqual(records, [
				{ type: "warcinfo", url: null },
				{ type: "warcinfo", url: null },
				{ type: "warcinfo", url: null },
				{ type: "request", url: "http://example.com/" },
				{ type: "response", url: "http://example.com/" },
				{ type: "request", url: "http://example.com/favicon.ico" },
				{ type: "response", url: "http://example.com/favicon.ico" },
				{ type: "response", url: "file:///screenshot.png" },
				{ type: "response", url: "file:///dom-snapshot.html" },
				{ type: "response", url: "file:///pdf-snapshot.pdf" },
				{ type: "response", url: "file:///provenance-summary.html" },
			]);
		}),
	);

	await t.test(
		"creates WACZ file",
		withTempDir(async (tempDir) => {
			// round trip test - extract, create, extract
			const fixtureFile = path.join(FIXTURES_DIR, "example.wacz");
			const unpackedFixtureDir = path.join(tempDir, "fixture");
			const packedOutputFile = path.join(tempDir, "output.wacz");
			const unpackedOutputDir = path.join(tempDir, "output");
			await extractArchive(fixtureFile, unpackedFixtureDir);
			await createArchive(unpackedFixtureDir, packedOutputFile);
			await extractArchive(packedOutputFile, unpackedOutputDir);

			assert.deepEqual(await globDir(unpackedOutputDir), [
				"archive",
				"archive/data",
				"archive/data.warc.gz",
				"archive/data/data.warc",
				"archive/data/file:",
				"archive/data/file:/dom-snapshot.html",
				"archive/data/file:/pdf-snapshot.pdf",
				"archive/data/file:/provenance-summary.html",
				"archive/data/file:/screenshot.png",
				"archive/data/http:",
				"archive/data/http:/com,example)",
				"archive/data/http:/com,example)/__index__.html",
				"archive/data/http:/com,example)/favicon.ico",
				"datapackage-digest.json",
				"datapackage.json",
				"indexes",
				"indexes/index.cdx",
				"pages",
				"pages/pages.jsonl",
			]);
		}),
	);
});
