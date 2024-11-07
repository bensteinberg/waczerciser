import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";
import { glob } from "fs/promises";
export const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = path.join(TEST_DIR, "fixtures");

/**
 * Creates a temporary directory for test execution and ensures cleanup
 * @param fn Function to execute within the temporary directory
 * @returns A function that accepts a test context and executes the provided function
 */
export const withTempDir =
	(fn: (tempDir: string) => Promise<void>) => async (t: any) => {
		const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "test-"));
		t.after(async () => {
			await fs.promises.rm(tempDir, { recursive: true, force: true });
		});
		await fn(tempDir);
	};

export const globDir = async (dir: string, pattern: string = "**/*") => {
	return (await Array.fromAsync(glob(pattern, { cwd: dir }))).sort();
};
