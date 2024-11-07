import chalk from "chalk";

export function exit(message: string, code: number = 0) {
	if (code === 0) {
		console.log(chalk.green(message));
	} else {
		console.error(chalk.red(message));
	}
	process.exit(code);
}
