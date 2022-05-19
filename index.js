const fsp = require('fs/promises');
const [, , filepath] = process.argv;

if (!filepath) {
	process.exit(1);
}

const { spawn } = require('child_process');
const child = spawn('node', ['sar-render', filepath]);

child.on('error', console.error);

child.stdout.on('data', data => {
	console.log(`stdout: ${data}`);
});

console.log('Rendering');
