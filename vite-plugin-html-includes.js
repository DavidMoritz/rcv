import fs from 'fs';
import path from 'path';

export default function htmlIncludes() {
  let root;
  return {
    name: 'html-includes',
    configResolved(config) {
      root = config.root;
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(
          /<!--\s*include:\s*([\w./-]+)\s*-->/g,
          (match, filePath) => {
            const absPath = path.resolve(root, filePath);
            if (!fs.existsSync(absPath)) {
              throw new Error(`html-includes: file not found: ${absPath}`);
            }
            return fs.readFileSync(absPath, 'utf-8');
          }
        );
      }
    }
  };
}
