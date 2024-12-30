#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import prompt from "prompt";
import { IAddon } from "./types";

// Configure prompt
prompt.message = "";
prompt.delimiter = "";
prompt.colors = true;

const createPrompt = (schema: prompt.Schema, propertyName: string) => {
	return new Promise<string>((resolve, reject) => {
		prompt.get(schema, (err, result) => {
			if (err) {
				reject(err);
			} else {
				const property = result[propertyName];
				if (typeof property !== "string") {
					resolve(result[propertyName]?.toString() || "");
				} else {
					resolve(result[propertyName] as string);
				}
			}
		});
	});
};

// Function to load available addons
const loadAddons = async () => {
	const addonsDir = path.join(__dirname, "./addons");
	const addons: IAddon[] = [];

	const addonsDirExists = await fs.exists(addonsDir);

	if (addonsDirExists) {
		const addonFolders = (await fs.readdir(addonsDir, { withFileTypes: true })).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);

		for (const folder of addonFolders) {
			const configPath = path.join(addonsDir, folder, "addon.config.json");
			if (fs.existsSync(configPath)) {
				const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
				addons.push({
					...config, // Include all properties from config
					folder
				});
			}
		}
	}

	return addons;
};

// Function to apply addon changes
async function applyAddon(projectPath: string, addon: IAddon) {
	// Add dependencies to package.json
	const packagePath = path.join(projectPath, "package.json");
	let packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

	packageJson = {
		...packageJson,
		dependencies: {
			...packageJson.dependencies,
			...addon.dependencies
		},
		devDependencies: {
			...packageJson.devDependencies,
			...addon.devDependencies
		}
	};

	await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));

	// Create new folders if specified
	if (addon.newFolders) {
		for (const folder of addon.newFolders) {
			const folderPath = path.join(projectPath, folder.path);
			fs.mkdirSync(folderPath, { recursive: true });
		}
	}

	// Create new files if specified
	if (addon.newFiles) {
		for (const file of addon.newFiles) {
			const filePath = path.join(projectPath, file.path);
			// Ensure the directory exists
			fs.mkdirSync(path.dirname(filePath), { recursive: true });
			fs.writeFileSync(filePath, file.content);
		}
	}

	// Apply file changes
	for (const change of addon.fileChanges || []) {
		const filePath = path.join(projectPath, change.path);
		let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
		const lines = content.split("\n");

		// Handle different types of changes
		switch (change.type || "insert") {
			case "replace":
				// Replace the line at the specified position
				lines[change.line] = change.content;
				break;
			case "insert":
			default:
				// Insert content at the specified line
				lines.splice(change.line - 1, 0, change.content);
				break;
		}

		fs.writeFileSync(filePath, lines.join("\n"));
	}

	// Log what was created
	if (addon.newFolders) {
		addon.newFolders.forEach(folder => {
			console.log(`    ↳ Created folder: ${folder.path}`);
		});
	}
	if (addon.newFiles) {
		addon.newFiles.forEach(file => {
			console.log(`    ↳ Created file: ${file.path}`);
		});
	}
}

// Function to prompt for project name
async function askProjectName() {
	const schema = {
		properties: {
			name: {
				description: "📦 What is your project name?",
				pattern: /^[a-zA-Z0-9-_]+$/,
				message: "Name must contain only letters, numbers, dashes, and underscores",
				required: true
			}
		}
	};

	const name = await createPrompt(schema, "name");
	return (name as string) || "";
}

// Function to prompt for addon selection
async function askAddons(addons: IAddon[]) {
	if (addons.length === 0) {
		return [];
	}

	console.log("\n📦 Available addons:");
	addons.forEach((addon, i) => {
		console.log(`${i + 1}) ${addon.name} - ${addon.description}`);
	});

	const schema = {
		properties: {
			selected: {
				description: "🔍 Enter the numbers of addons you want to install (comma-separated, or press enter for none)",
				pattern: /^[0-9,\s]*$/,
				message: "Please enter numbers separated by commas, or press enter for none",
				required: false
			}
		}
	};

	const selected = await createPrompt(schema, "selected");

	if (!selected) {
		return [];
	}

	const selectedIndices = selected
		.split(",")
		.map(n => parseInt(n.trim()))
		.filter(n => !isNaN(n) && n > 0 && n <= addons.length)
		.map(n => n - 1);

	return selectedIndices.map(i => addons[i]);
}

// Function to copy template files recursively
function copyTemplateFiles(source: string, target: string) {
	// Create target directory if it doesn't exist
	fs.mkdirSync(target, { recursive: true });

	// If source doesn't exist, create an empty directory
	if (!fs.existsSync(source)) {
		return;
	}

	const files = fs.readdirSync(source, { withFileTypes: true });

	for (const file of files) {
		const sourcePath = path.join(source, file.name);
		const targetPath = path.join(target, file.name);

		if (file.isDirectory()) {
			copyTemplateFiles(sourcePath, targetPath);
		} else {
			fs.copyFileSync(sourcePath, targetPath);
		}
	}
}

// Function to prompt for port number
async function askPort() {
	const schema = {
		properties: {
			port: {
				description: "🌐 What port would you like to use? (default: 3000)",
				pattern: /^[0-9]+$/,
				message: "Port must be a number",
				required: false,
				default: "3000"
			}
		}
	};

	const port = await createPrompt(schema, "port");
	return Number(port) || 3000;
}

async function main() {
	try {
		prompt.start();

		// Get project name
		const projectName = process.argv[2] || (await askProjectName());

		if (!projectName) {
			console.error("Please provide a valid project name");
			return;
		}

		// Get port number
		const port = await askPort();
		const selectedAddons = await askAddons(await loadAddons());

		const projectPath = path.join(process.cwd(), projectName);
		const templateDir = path.join(__dirname, "./templates");

		// Create project directory
		console.log(`\n✨ Creating a new Expressr app in ${projectPath}`);
		fs.mkdirSync(projectPath, { recursive: true });

		// Create basic project structure
		const dirs = ["src", "src/routes", "src/utils"];
		dirs.forEach(dir => {
			fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
		});

		// Copy template files
		console.log("📁 Copying template files...");
		const templateSrcDir = path.join(templateDir, "src");
		copyTemplateFiles(templateSrcDir, path.join(projectPath, "src"));

		// Copy and modify root template files

		for (const file of ["package.json", "tsconfig.json"]) {
			const sourcePath = path.join(templateDir, file);
			const targetPath = path.join(projectPath, file);

			if (!fs.existsSync(sourcePath)) {
				console.error(`Template file not found: ${sourcePath}`);
				console.error("This is likely an issue with the package installation.");
				process.exit(1);
			}

			try {
				await fs.copyFile(sourcePath, targetPath);
			} catch (err) {
				throw new Error(`Error copying file ${file}: ${(err as unknown as any).message}`);
			}
		}

		// Create or modify .env file with port
		const envPath = path.join(projectPath, ".env");
		await fs.writeFile(envPath, `EXPRESSR_PORT=${port}\n`);
		console.log(`    ↳ Created .env with EXPRESSR_PORT=${port}`);

		// Update index.ts to use the environment port
		const indexPath = path.join(projectPath, "src", "index.ts");
		if (fs.existsSync(indexPath)) {
			let indexContent = await fs.readFile(indexPath, "utf8");
			// Replace any existing port definition with environment variable
			indexContent = indexContent.replace(/const port\s*=\s*\d+/, "const port = process.env.EXPRESSR_PORT || 3000");
			// Add dotenv import if not present
			if (!indexContent.includes("dotenv")) {
				indexContent = `import 'dotenv/config';\n${indexContent}`;
			}
			await fs.writeFile(indexPath, indexContent);
		}

		// Add dotenv to package.json dependencies
		const packagePath = path.join(projectPath, "package.json");
		const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
		packageJson.dependencies = {
			...packageJson.dependencies,
			dotenv: "^16.3.1"
		};
		await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));

		// Apply selected addons
		if (selectedAddons.length > 0) {
			console.log("\n🔧 Installing selected addons...");
			for (const addon of selectedAddons) {
				console.log(`  • Installing ${addon.name}...`);
				await applyAddon(projectPath, addon);
			}
		}

		// Install dependencies
		console.log("\n📦 Installing dependencies...");
		try {
			process.chdir(projectPath);
			execSync("npm install", { stdio: "inherit" });
		} catch (err) {
			throw new Error(`Error installing dependencies: ${(err as unknown as any).message}`);
		}

		console.log(`
✅ Success! Created ${projectName} at ${projectPath}
Inside that directory, you can run several commands:

  npm run dev
    Starts the development server on port ${port}.

  npm run build
    Builds the app for production.

  npm start
    Runs the built app in production mode. (You must first run 'npm run build')

Get started by typing:

  cd ${projectName}
  npm run dev

Thank you for using expressr! 
Please support me by checking my website ❤️  https://skxv.dev
`);
	} catch (err) {
		console.error("❌ Error:", (err as unknown as any).message);
		process.exit(1);
	}
}

main().catch(err => {
	console.error("❌ Error:", err);
	process.exit(1);
});
