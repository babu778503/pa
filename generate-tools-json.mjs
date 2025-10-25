import fs from 'fs';
import path from 'path';

const toolsDir = 'tools';
const jsonOutputFile = 'tools.json';
const sitemapOutputFile = 'sitemap.xml';
const baseUrl = 'https://toolshub365.com';

try {
    // Check if the tools directory exists
    if (!fs.existsSync(toolsDir)) {
        console.warn(`Warning: Directory '${toolsDir}' not found. Creating empty files.`);
        fs.writeFileSync(jsonOutputFile, JSON.stringify([], null, 2));
        fs.writeFileSync(sitemapOutputFile, '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
        process.exit(0);
    }

    console.log(`Scanning directory: ${toolsDir}`);
    const files = fs.readdirSync(toolsDir).filter(file => file.endsWith('.html'));
    
    if (files.length === 0) {
        console.warn(`Warning: No HTML files found in '${toolsDir}'. Creating empty files.`);
        fs.writeFileSync(jsonOutputFile, JSON.stringify([], null, 2));
        fs.writeFileSync(sitemapOutputFile, '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
        process.exit(0);
    }

    console.log(`Found ${files.length} HTML tool files.`);

    const toolsData = files.map(file => {
        const filePath = path.join(toolsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        const titleMatch = content.match(/<title>(.*?)<\/title>/i);
        const name = titleMatch ? titleMatch[1].trim() : 'Unnamed Tool';

        const categoryMatch = content.match(/<!--\s*Category:\s*(.*?)\s*-->/i);
        const category = categoryMatch ? categoryMatch[1].trim() : 'Utility';

        const id = path.basename(file, '.html');
        
        return { id, Name: name, Category: category };
    });

    // Sort all tools alphabetically by their name for a consistent order
    toolsData.sort((a, b) => a.Name.localeCompare(b.Name));
    
    // Write the sorted data to the JSON file
    fs.writeFileSync(jsonOutputFile, JSON.stringify(toolsData, null, 2));
    console.log(`✅ Successfully generated ${jsonOutputFile} with ${toolsData.length} tools.`);

    // --- Generate sitemap.xml ---
    const lastMod = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const sitemapUrls = toolsData.map(tool => `
  <url>
    <loc>${baseUrl}/tool/${tool.id}</loc>
    <lastmod>${lastMod}</lastmod>
  </url>`);

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${lastMod}</lastmod>
  </url>${sitemapUrls.join('')}
</urlset>`;

    fs.writeFileSync(sitemapOutputFile, sitemapContent.trim());
    console.log(`✅ Successfully generated ${sitemapOutputFile} with ${toolsData.length + 1} URLs.`);


} catch (error) {
    console.error('❌ Error generating files:', error);
    process.exit(1);
}
