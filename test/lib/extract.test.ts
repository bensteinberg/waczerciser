import { test } from "node:test";
import assert from "node:assert/strict";
import { extractArchive } from "../../src/lib/extract.ts";
import path from "path";
import { withTempDir, FIXTURES_DIR, globDir } from "../helpers.ts";

test("extract.extractArchive", async (t) => {
	await t.test(
		"extracts WARC file",
		withTempDir(async (tempDir) => {
			const inputFile = path.join(FIXTURES_DIR, "example.warc.gz");
			const outputDir = path.join(tempDir, "output");
			await extractArchive(inputFile, outputDir);
			assert.deepEqual(await globDir(outputDir), [
				"example.warc",
				"file:",
				"file:/dom-snapshot.html",
				"file:/pdf-snapshot.pdf",
				"file:/provenance-summary.html",
				"file:/screenshot.png",
				"http:",
				"http:/example.com",
				"http:/example.com/__index__.html",
				"http:/example.com/favicon.ico",
			]);
		}),
	);

	await t.test(
		"extracts WACZ file",
		withTempDir(async (tempDir) => {
			const inputFile = path.join(FIXTURES_DIR, "example.wacz");
			const outputDir = path.join(tempDir, "output");
			await extractArchive(inputFile, outputDir);
			assert.deepEqual(await globDir(outputDir), [
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
				"archive/data/http:/example.com",
				"archive/data/http:/example.com/__index__.html",
				"archive/data/http:/example.com/favicon.ico",
				"datapackage-digest.json",
				"datapackage.json",
				"indexes",
				"indexes/index.cdx",
				"pages",
				"pages/pages.jsonl",
			]);
		}),
	);

	await t.test(
		"extracts WACZ file with long query string",
		withTempDir(async (tempDir) => {
			const inputFile = path.join(FIXTURES_DIR, "long-query-string.wacz");
			const outputDir = path.join(tempDir, "output");
			await extractArchive(inputFile, outputDir);
			assert.deepEqual(await globDir(outputDir), [
				"archive",
				"archive/data",
				"archive/data.warc.gz",
				"archive/data/data.warc",
				"archive/data/file:",
				"archive/data/file:/dom-snapshot.html",
				"archive/data/file:/example.com.pem",
				"archive/data/file:/pdf-snapshot.pdf",
				"archive/data/file:/provenance-summary.html",
				"archive/data/file:/screenshot.png",
				"archive/data/https:",
				"archive/data/https:/example.com",
				"archive/data/https:/example.com/?domain=fnord.com&page=%2Fen-fr%2Fcontact%2Fsales&referrer=https%3A%2F%2Ffnord.com%2Fen-fr%2Fenterprise&cid=dff55bc5-848a-4c2a-9191-1025e4aa6a7d&lsid=dff55bc5-848a-4c2a-9191-1025e4aa6a7d&vie_339c5db546a92e09bd1d0d278a42bdaa4d865e0b8ebf04f587d6eded3bea8c2f",
				"archive/data/https:/example.com/favicon.ico",
				"datapackage-digest.json",
				"datapackage.json",
				"indexes",
				"indexes/index.cdx",
				"pages",
				"pages/pages.jsonl",
			]);
		}),
	);

	await t.test("throws on invalid file type", async () => {
		await assert.rejects(extractArchive("invalid.txt", "output"), {
			message: "Unknown file type. Supported formats: .wacz, .warc, .warc.gz",
		});
	});
});
