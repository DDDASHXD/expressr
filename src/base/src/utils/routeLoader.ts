import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;

interface RouteModule {
	default?: RequestHandler;
	get?: RequestHandler;
	post?: RequestHandler;
	put?: RequestHandler;
	delete?: RequestHandler;
	patch?: RequestHandler;
}

export function loadRoutes(routesDir: string): Router {
	const router = Router();

	function processFile(filePath: string) {
		const relativePath = path.relative(routesDir, filePath);
		const routePath = relativePath
			.replace(/\.[jt]s$/, "") // Remove file extension
			.replace(/\[([^\]]+)\]/g, ":$1") // Convert [param] to :param
			.replace(/\([^)]+\)\//g, "") // Remove (grouping) from path
			.replace(/\/index$/, ""); // Remove index from path

		const route = require(filePath);
		const routeModule: RouteModule = route.default || route;

		if (typeof routeModule === "function") {
			router.all(`/${routePath}`, routeModule);
		} else {
			// Handle HTTP methods
			if (routeModule.get) router.get(`/${routePath}`, routeModule.get);

			if (routeModule.post) {
				router.post(
					`/${routePath}`,
					typeof routeModule.post === "function" ? routeModule.post : (routeModule.post as { handler: RequestHandler }).handler
				);
			}

			if (routeModule.put) router.put(`/${routePath}`, routeModule.put);
			if (routeModule.delete) router.delete(`/${routePath}`, routeModule.delete);
			if (routeModule.patch) router.patch(`/${routePath}`, routeModule.patch);
		}
	}

	function walkDir(dir: string) {
		const files = fs.readdirSync(dir);

		for (const file of files) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);

			if (stat.isDirectory()) {
				walkDir(filePath);
			} else if (file.match(/\.[jt]s$/)) {
				processFile(filePath);
			}
		}
	}

	if (fs.existsSync(routesDir)) {
		walkDir(routesDir);
	}

	return router;
}
