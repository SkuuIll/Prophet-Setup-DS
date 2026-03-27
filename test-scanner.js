const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            if (!file.includes('node_modules') && !file.includes('.git')) {
                results = results.concat(walkDir(file));
            }
        } else { 
            if (file.endsWith('.js')) results.push(file);
        }
    });
    return results;
}

const files = walkDir('./');
for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('.run(')) {
            // Check if there's any parameter that might be an object
            // Just log to allow manual review quickly
            console.log(file + ':' + (i+1) + '  ' + lines[i].trim());
        }
    }
}
