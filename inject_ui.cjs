const fs = require('fs');

const sourceHTML = fs.readFileSync('E:/Water Shaders/Water shader 2/open-sea-ocean/index.html', 'utf8');
let targetHTML = fs.readFileSync('index.html', 'utf8');

const styleMatch = sourceHTML.match(/<style>([\s\S]*?)<\/style>/);
const uiMatch = sourceHTML.match(/<div id="ui">([\s\S]*?)<p class="hint"/);

if (styleMatch && uiMatch) {
    let styleContent = styleMatch[1];
    
    // Quick fix for fonts (replace local Geist with system fonts or just let it fall back)
    styleContent = styleContent.replace(/@font-face\s*{[^}]*}/g, '');

    let uiContent = '<div id="water-editor" style="display:none; z-index: 10000; position: fixed; top:0; left:0; width: 100%; height: 100%; pointer-events: none;">' + uiMatch[1] + '</div>';

    // Inject styles
    targetHTML = targetHTML.replace('</style>', styleContent + '\n</style>');

    // Inject UI before crystal-editor
    targetHTML = targetHTML.replace('<div id="crystal-editor"', uiContent + '\n<div id="crystal-editor"');

    fs.writeFileSync('index.html', targetHTML);
    console.log('Injected successfully');
} else {
    console.log('Regex match failed');
}
