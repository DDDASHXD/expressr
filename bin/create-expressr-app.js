#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const prompt = require('prompt');

// Configure prompt
prompt.message = '';
prompt.delimiter = '';
prompt.colors = true;

// Function to load available addons
function loadAddons() {
  const addonsDir = path.join(__dirname, '../addons');
  const addons = [];
  
  if (fs.existsSync(addonsDir)) {
    const addonFolders = fs.readdirSync(addonsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const folder of addonFolders) {
      const configPath = path.join(addonsDir, folder, 'addon.config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        addons.push({
          ...config,  // Include all properties from config
          folder
        });
      }
    }
  }
  
  return addons;
}

// Function to apply addon changes
function applyAddon(projectPath, addon) {
  // Add dependencies to package.json
  const packagePath = path.join(projectPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  packageJson.dependencies = {
    ...packageJson.dependencies,
    ...addon.dependencies
  };
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

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
    let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    const lines = content.split('\n');
    
    // Handle different types of changes
    switch (change.type || 'insert') {
      case 'replace':
        // Replace the line at the specified position
        lines[change.line - 1] = change.content;
        break;
      case 'insert':
      default:
        // Insert content at the specified line
        lines.splice(change.line - 1, 0, change.content);
        break;
    }
    
    fs.writeFileSync(filePath, lines.join('\n'));
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
function askProjectName() {
  return new Promise((resolve, reject) => {
    const schema = {
      properties: {
        name: {
          description: '📦 What is your project name?',
          pattern: /^[a-zA-Z0-9-_]+$/,
          message: 'Name must contain only letters, numbers, dashes, and underscores',
          required: true
        }
      }
    };

    prompt.get(schema, (err, result) => {
      if (err) {
        if (err.message === 'canceled') {
          console.log('\n❌ Operation cancelled by user');
          process.exit(1);
        }
        reject(err);
        return;
      }
      resolve(result.name);
    });
  });
}

// Function to prompt for addon selection
function askAddons(addons) {
  return new Promise((resolve, reject) => {
    if (addons.length === 0) {
      resolve([]);
      return;
    }

    console.log('\n📦 Available addons:');
    addons.forEach((addon, i) => {
      console.log(`${i + 1}) ${addon.name} - ${addon.description}`);
    });

    const schema = {
      properties: {
        selected: {
          description: '🔍 Enter the numbers of addons you want to install (comma-separated, or press enter for none)',
          pattern: /^[0-9,\s]*$/,
          message: 'Please enter numbers separated by commas, or press enter for none',
          required: false
        }
      }
    };

    prompt.get(schema, (err, result) => {
      if (err) {
        if (err.message === 'canceled') {
          console.log('\n❌ Operation cancelled by user');
          process.exit(1);
        }
        reject(err);
        return;
      }

      if (!result.selected) {
        resolve([]);
        return;
      }

      const selectedIndices = result.selected.split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n) && n > 0 && n <= addons.length)
        .map(n => n - 1);

      resolve(selectedIndices.map(i => addons[i]));
    });
  });
}

// Function to copy template files recursively
function copyTemplateFiles(source, target) {
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
function askPort() {
  return new Promise((resolve, reject) => {
    const schema = {
      properties: {
        port: {
          description: '🌐 What port would you like to use? (default: 3000)',
          pattern: /^[0-9]+$/,
          message: 'Port must be a number',
          required: false,
          default: '3000'
        }
      }
    };

    prompt.get(schema, (err, result) => {
      if (err) {
        if (err.message === 'canceled') {
          console.log('\n❌ Operation cancelled by user');
          process.exit(1);
        }
        reject(err);
        return;
      }
      resolve(result.port);
    });
  });
}

async function main() {
  try {
    prompt.start();

    // Get project name
    const projectName = process.argv[2] || await askProjectName();

    if (!projectName) {
      console.error('Please provide a project name');
      return;
    }

    // Get port number
    const port = await askPort();

    const projectPath = path.join(process.cwd(), projectName);
    const templateDir = path.join(__dirname, '../templates');

    // Load available addons
    const addons = loadAddons();
    
    // Get selected addons
    const selectedAddons = await askAddons(addons);

    // Create project directory
    console.log(`\n✨ Creating a new Expressr app in ${projectPath}`);
    fs.mkdirSync(projectPath, { recursive: true });

    // Create basic project structure
    const dirs = ['src', 'src/routes', 'src/utils'];
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    });

    // Copy template files
    console.log('📁 Copying template files...');
    const templateSrcDir = path.join(templateDir, 'src');
    copyTemplateFiles(templateSrcDir, path.join(projectPath, 'src'));

    // Copy and modify root template files
    ['package.json', 'tsconfig.json'].forEach(file => {
      const sourcePath = path.join(templateDir, file);
      const targetPath = path.join(projectPath, file);
      
      if (!fs.existsSync(sourcePath)) {
        console.error(`Template file not found: ${sourcePath}`);
        console.error('This is likely an issue with the package installation.');
        process.exit(1);
      }

      try {
        fs.copyFileSync(sourcePath, targetPath);
      } catch (err) {
        throw new Error(`Error copying file ${file}: ${err.message}`);
      }
    });

    // Create or modify .env file with port
    const envPath = path.join(projectPath, '.env');
    fs.writeFileSync(envPath, `EXPRESSR_PORT=${port}\n`);
    console.log(`    ↳ Created .env with EXPRESSR_PORT=${port}`);

    // Update index.ts to use the environment port
    const indexPath = path.join(projectPath, 'src', 'index.ts');
    if (fs.existsSync(indexPath)) {
      let indexContent = fs.readFileSync(indexPath, 'utf8');
      // Replace any existing port definition with environment variable
      indexContent = indexContent.replace(
        /const port\s*=\s*\d+/,
        'const port = process.env.EXPRESSR_PORT || 3000'
      );
      // Add dotenv import if not present
      if (!indexContent.includes('dotenv')) {
        indexContent = `import 'dotenv/config';\n${indexContent}`;
      }
      fs.writeFileSync(indexPath, indexContent);
    }

    // Add dotenv to package.json dependencies
    const packagePath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.dependencies = {
      ...packageJson.dependencies,
      'dotenv': '^16.3.1'
    };
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

    // Apply selected addons
    if (selectedAddons.length > 0) {
      console.log('\n🔧 Installing selected addons...');
      for (const addon of selectedAddons) {
        console.log(`  • Installing ${addon.name}...`);
        applyAddon(projectPath, addon);
      }
    }

    // Install dependencies
    console.log('\n📦 Installing dependencies...');
    try {
      process.chdir(projectPath);
      execSync('npm install', { stdio: 'inherit' });
    } catch (err) {
      throw new Error(`Error installing dependencies: ${err.message}`);
    }

    console.log(`
✅ Success! Created ${projectName} at ${projectPath}
Inside that directory, you can run several commands:

  npm run dev
    Starts the development server on port ${port}.

  npm run build
    Builds the app for production.

  npm start
    Runs the built app in production mode.

Get started by typing:

  cd ${projectName}
  npm run dev

Thank you for using expressr! 
Please support me by checking my website ❤️  https://skxv.dev
`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
}); 