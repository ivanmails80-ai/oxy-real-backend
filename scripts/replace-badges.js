const fs = require('fs');
const path = require('path');
const appPath = path.join(__dirname, '..', 'App.js');
let s = fs.readFileSync(appPath, 'utf8');
const start = s.indexOf('// Power Badges — prompt esatti');
const end = s.indexOf('];', start) + 2;
const newBlock = `// Power Badges: definizioni in src/data/powerBadges.js
import { POWER_BADGES, getBadgePrompt, messageStartsWithBadgePrompt } from './src/data/powerBadges';
`;
s = s.slice(0, start) + newBlock + s.slice(end);
fs.writeFileSync(appPath, s);
