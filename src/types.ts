export interface IAddon {
	name: string;
	description: string;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	fileChanges: Array<{
		path: string;
		line: number;
		type: string;
		content: string;
	}>;

	newFolders: Array<{
		path: string;
	}>;
	newFiles: Array<{
		path: string;
		content: string;
	}>;
}
