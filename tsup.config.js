import { defineConfig } from "tsup";
import fs from "fs-extra";
import path from "path";

export default defineConfig({
	entry: ["./src/create-expressr-app.ts"],
	splitting: false,
	sourcemap: true,
	clean: true,
	outDir: "bin",
	bundle: false, // if set to true, bundling is disabled

	onSuccess: async () => {
		// Once the build succeeds, we copy the needed files into the bin directory (raw files, no building)
		await fs.promises.cp(path.join("src", "templates"), path.join("bin", "templates"), { recursive: true });
		await fs.promises.cp(path.join("src", "base"), path.join("bin", "base"), { recursive: true });
		await fs.promises.cp(path.join("src", "addons"), path.join("bin", "addons"), { recursive: true });
	}
});
