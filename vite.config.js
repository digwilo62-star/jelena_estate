import { defineConfig } from 'vite';

// Keep the complete design in the HTML so a missing or stale CSS asset cannot
// leave the deployed page unstyled.
export default defineConfig({
  // Embed imported photos in the bundle to avoid missing image requests.
  build: { assetsInlineLimit: 10 * 1024 * 1024 },
  plugins: [{
    name: 'self-contained-production-page',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') throw new Error('Missing production HTML');
      const styles = Object.values(bundle).filter(file => file.type === 'asset' && file.fileName.endsWith('.css'));
      if (!styles.length) throw new Error('Missing production styles');
      const css = styles.map(file => String(file.source)).join('\n');
      html.source = String(html.source)
        .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, '')
        .replace('</head>', `<style>${css}</style></head>`);
      html.source = String(html.source).replace(
        /<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g,
        (tag, url) => {
          const fileName = url.replace(/^\//, '');
          const chunk = bundle[fileName];
          if (!chunk || chunk.type !== 'chunk') throw new Error('Missing app bundle: ' + fileName);
          const safeCode = chunk.code.replace(/<\/script/gi, '<\\/script');
          return '<script type="module">' + safeCode + '</script>';
        }
      );
      if (/<script[^>]*src=/.test(String(html.source))) throw new Error('App script was not embedded');
      if (!String(html.source).includes('.hero{')) throw new Error('Hero styling was not embedded');
    }
  }]
});
