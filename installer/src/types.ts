export interface IAddon {
	name: string;
	description: string;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	fileChanges: Array<{
		path: string;
		line: number;
		content: string;
	}>;
}
