import fs from 'fs';
import path from 'path';
import { parse } from 'node-html-parser'; // --- CHANGED: Using a proper HTML parser

const toolsDir = 'tools';
const outputFile = 'tools.json';

try {
    if (!fs.existsSync(toolsDir)) {
        console.warn(`Warning: Directory '${toolsDir}' not found. Creating an empty tools.json.`);
        fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
        process.exit(0);
    }

    const files = fs.readdirSync(toolsDir).filter(file => file.endsWith('.html'));
    
    if (files.length === 0) {
        console.warn(`Warning: No HTML files found in '${toolsDir}'. Creating an empty tools.json.`);
        fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
        process.exit(0);
    }

    const toolsData = files.map(file => {
        const filePath = path.join(toolsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // --- FIXED: Use a robust parser for the title
        const root = parse(content);
        const name = root.querySelector('title')?.text.trim() || 'Unnamed Tool';

        // Keep using a simple regex for the very specific comment format
        const categoryMatch = content.match(/<!--\s*Category:\s*(.*?)\s*-->/i);
        const category = categoryMatch ? categoryMatch[1].trim() : 'Utility';

        const id = path.basename(file, '.html');
        
        return { id, Name: name, Category: category };
    });

    toolsData.sort((a, b) => a.Name.localeCompare(b.Name));
    
    fs.writeFileSync(outputFile, JSON.stringify(toolsData, null, 2));
    
    console.log(`✅ Successfully generated ${outputFile} with ${toolsData.length} tools.`);

} catch (error) {
    console.error('❌ Error generating tools.json:', error);
    process.exit(1);
}
