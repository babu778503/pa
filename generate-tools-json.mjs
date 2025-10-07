import fs from 'fs';
import path from 'path';

const toolsDir = 'tools';
const outputFile = 'tools.json';

try {
    // Check if the tools directory exists
    if (!fs.existsSync(toolsDir)) {
        console.warn(`Warning: Directory '${toolsDir}' not found. Creating an empty tools.json.`);
        fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
        process.exit(0); // Exit successfully
    }

    console.log(`Scanning directory: ${toolsDir}`);
    const files = fs.readdirSync(toolsDir).filter(file => file.endsWith('.html'));
    
    if (files.length === 0) {
        console.warn(`Warning: No HTML files found in '${toolsDir}'. Creating an empty tools.json.`);
        fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
        process.exit(0); // Exit successfully
    }

    console.log(`Found ${files.length} HTML tool files.`);

    const toolsData = files.map(file => {
        const filePath = path.join(toolsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // 1. Extract tool name from the <title> tag
        const titleMatch = content.match(/<title>(.*?)<\/title>/i);
        const name = titleMatch ? titleMatch[1].trim() : 'Unnamed Tool';

        // 2. Extract category from the specific comment format: <!-- Category: ... -->
        const categoryMatch = content.match(/<!--\s*Category:\s*(.*?)\s*-->/i);
        const category = categoryMatch ? categoryMatch[1].trim() : 'Utility'; // Default to 'Utility' if not found

        // 3. Use the filename (without .html) as the unique ID
        const id = path.basename(file, '.html');
        
        return { id, Name: name, Category: category };
    });

    // Sort all tools alphabetically by their name for a consistent order
    toolsData.sort((a, b) => a.Name.localeCompare(b.Name));
    
    // Write the sorted data to the JSON file with pretty formatting (2-space indentation)
    fs.writeFileSync(outputFile, JSON.stringify(toolsData, null, 2));
    
    console.log(`✅ Successfully generated ${outputFile} with ${toolsData.length} tools.`);

} catch (error) {
    console.error('❌ Error generating tools.json:', error);
    process.exit(1); // Exit with an error code to fail the build process
}
