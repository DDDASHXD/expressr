#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const prompt = require("prompt");

// Ensure templates directory exists
const templatesDir = path.join(__dirname, "src", "templates");
const templatesSrcDir = path.join(templatesDir, "src");

// Configure prompt
prompt.message = "";
prompt.delimiter = "";
prompt.colors = false;

// Function to ask user for confirmation
function askForConfirmation() {
	return new Promise((resolve, reject) => {
		const schema = {
			properties: {
				confirm: {
					description: "🤔 Templates directory already exists. Would you like to delete everything and start fresh? (y/N)",
					type: "string",
					pattern: /^[ynYN\s]*$/,
					message: "Please enter y or n",
					default: "n",
					required: true
				}
			}
		};

		prompt.start();
		prompt.get(schema, (err, result) => {
			if (err) {
				if (err.message === "canceled") {
					console.log("\n❌ Operation cancelled by user");
					process.exit(1);
				}
				reject(err);
				return;
			}
			resolve(result.confirm.toLowerCase().startsWith("y"));
		});
	});
}

// Function to clean templates directory
function cleanTemplates() {
	if (fs.existsSync(templatesSrcDir)) {
		fs.rmSync(templatesSrcDir, { recursive: true, force: true });
	}
	// Clean package.json and tsconfig.json in templates
	const templateFiles = ["package.json", "tsconfig.json"].map(file => path.join(templatesDir, file));
	templateFiles.forEach(file => {
		if (fs.existsSync(file)) {
			fs.unlinkSync(file);
		}
	});
}

// Create directories if they don't exist
function ensureDirectoryExists(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

// Copy directory recursively
function copyDir(src, dest) {
	ensureDirectoryExists(dest);
	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

// Main build process
async function build() {
	const args = process.argv.slice(2);
	const shouldRebuild = args.includes("-r");

	if (fs.existsSync(templatesSrcDir)) {
		if (shouldRebuild) {
			console.log("🗑️  Cleaning existing templates directory...");
			cleanTemplates();
		} else {
			const shouldDelete = await askForConfirmation();
			if (shouldDelete) {
				console.log("🗑️  Cleaning existing templates directory...");
				cleanTemplates();
			}
		}
	}

	console.log("🚀 Starting build process...");

	// Ensure templates directory exists
	ensureDirectoryExists(templatesDir);
	ensureDirectoryExists(templatesSrcDir);

	// Copy source files
	console.log("📁 Copying source files...");
	const srcDir = path.join(__dirname, "src", "base", "src");
	copyDir(srcDir, templatesSrcDir);

	// Copy tsconfig.json if it exists
	const tsConfigPath = path.join(__dirname, "tsconfig.json");
	if (fs.existsSync(tsConfigPath)) {
		const tsConfig = require(tsConfigPath);

		tsConfig.compilerOptions = {
			...tsConfig.compilerOptions,
			rootDir: "./src"
		};
		tsConfig.exclude = ["node_modules"];

		fs.writeFileSync(path.join(templatesDir, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));
	}

	// Update templates/package.json if needed
	console.log("📦 Updating package.json...");
	const mainPackageJson = require("./package.json");
	const templatePackageJson = {
		name: "expressr-app",
		version: "1.0.0",
		description: "Express app with dynamic folder routing",
		main: "dist/index.js",
		scripts: {
			dev: "ts-node-dev --respawn --transpile-only src/index.ts",
			build: "tsc",
			start: "node dist/index.js"
		},
		dependencies: {
			express: mainPackageJson.dependencies.express
		},
		devDependencies: {
			"@types/express": mainPackageJson.devDependencies["@types/express"],
			"@types/node": mainPackageJson.devDependencies["@types/node"],
			"ts-node-dev": mainPackageJson.devDependencies["ts-node-dev"],
			typescript: mainPackageJson.devDependencies.typescript
		}
	};

	fs.writeFileSync(path.join(templatesDir, "package.json"), JSON.stringify(templatePackageJson, null, 2));

	console.log("✨ Build completed successfully!");
}

build().catch(error => {
	console.error("❌ Build failed:", error);
	process.exit(1);
});
