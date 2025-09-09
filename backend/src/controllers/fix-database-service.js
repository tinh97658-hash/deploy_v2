const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'studentController.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances
content = content.replace(/DatabaseService\.executeQuery/g, 'DatabaseService.execute');

// Write back to file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Replacement completed successfully!');
