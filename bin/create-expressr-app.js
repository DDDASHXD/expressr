#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function verifyTemplateFile(templateDir, filePath) {
  const fullPath = path.join(templateDir, filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Template file not found: ${fullPath}`);
    console.error('This is likely an issue with the package installation.');
    rl.close();
    process.exit(1);
  }
}

async function main() {
  try {
    // Get project name
    const projectName = process.argv[2] || await new Promise(resolve => {
      rl.question('What is your project name? ', answer => {
        resolve(answer);
      });
    });

    if (!projectName) {
      console.error('Please provide a project name');
      return;
    }

    const projectPath = path.join(process.cwd(), projectName);
    const templateDir = path.join(__dirname, '../templates');

    // Verify template directory exists
    if (!fs.existsSync(templateDir)) {
      console.error(`Template directory not found: ${templateDir}`);
      console.error('This is likely an issue with the package installation.');
      return;
    }

    // Create project directory
    console.log(`Creating a new Express.js app in ${projectPath}`);
    fs.mkdirSync(projectPath, { recursive: true });

    // Create project structure
    const dirs = [
      'src',
      'src/routes',
      'src/routes/examples',
      'src/routes/(api)',
      'src/utils',
    ];

    dirs.forEach(dir => {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    });

    // Verify and copy template files
    const templateFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/utils/routeLoader.ts',
      'src/routes/examples/test.ts',
      'src/routes/examples/[id].ts',
      'src/routes/(api)/status.ts'
    ];

    templateFiles.forEach(file => {
      verifyTemplateFile(templateDir, file);
      try {
        fs.copyFileSync(
          path.join(templateDir, file),
          path.join(projectPath, file)
        );
      } catch (err) {
        throw new Error(`Error copying file ${file}: ${err.message}`);
      }
    });

    // Install dependencies
    console.log('Installing dependencies...');
    try {
      process.chdir(projectPath);
      execSync('npm install', { stdio: 'inherit' });
    } catch (err) {
      throw new Error(`Error installing dependencies: ${err.message}`);
    }

    console.log(`
Success! Created ${projectName} at ${projectPath}
Inside that directory, you can run several commands:

  npm run dev
    Starts the development server.

  npm run build
    Builds the app for production.

  npm start
    Runs the built app in production mode.

Get started by typing:

  cd ${projectName}
  npm run dev
`);
  } catch (err) {
    console.error('Error:', err.message);
    return;
  } finally {
    rl.close();
  }
}

// Handle readline close
rl.on('close', () => {
  process.exit(0);
});

main().catch(err => {
  console.error('Error:', err);
  rl.close();
}); 