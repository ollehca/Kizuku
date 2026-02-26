/**
 * CSS Management Module
 * Handles CSS injection, hot reloading, and SCSS compilation
 */

const path = require('node:path');
const fs = require('node:fs');
const { execFile } = require('node:child_process');

let mainWindow = null;
const isDev = process.env.NODE_ENV !== 'production';

function setMainWindow(window) {
  mainWindow = window;
}

function compileSCSS(scssPath, cssPath) {
  execFile('npx', ['sass', scssPath, cssPath], (error, stdout, stderr) => {
    if (error) {
      console.error(`SCSS compilation error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`SCSS compilation stderr: ${stderr}`);
      return;
    }
    console.log(`✅ SCSS compiled: ${path.basename(scssPath)} → ${path.basename(cssPath)}`);
    reloadCSS(cssPath);
  });
}

function reloadCSS(cssPath) {
  try {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    if (mainWindow && !mainWindow.isDestroyed()) {
      const fileName = path.basename(cssPath);
      const safeFileName = JSON.stringify(fileName);
      const safeCSS = JSON.stringify(cssContent);

      const script = `
        (function() {
          var fn = ${safeFileName};
          var oldStyle = document.querySelector('style[data-file="' + fn + '"]');
          if (oldStyle) { oldStyle.remove(); }
          var style = document.createElement('style');
          style.setAttribute('data-file', fn);
          style.textContent = ${safeCSS};
          document.head.appendChild(style);
        })();
      `;
      mainWindow.webContents.executeJavaScript(script);
    }
  } catch (cssError) {
    console.error('Failed to reload CSS:', cssError);
  }
}

function setupCSSHotReloading() {
  if (!isDev) {
    return;
  }

  const watchFiles = [
    {
      css: path.join(__dirname, '..', 'styles', 'kizuku-palette.css'),
    },
    {
      scss: path.join(__dirname, '..', 'styles', 'desktop.scss'),
      css: path.join(__dirname, '..', 'styles', 'desktop.css'),
    },
    {
      css: path.join(__dirname, '..', 'styles', 'kizuku-branding.css'),
    },
    {
      css: path.join(__dirname, '..', 'styles', 'loading.css'),
    },
  ];

  watchFiles.forEach(({ scss, css }) => {
    if (scss) {
      fs.watchFile(scss, { interval: 100 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log('SCSS file changed, recompiling...');
          compileSCSS(scss, css);
        }
      });
      console.log(`👀 Watching SCSS: ${path.basename(scss)}`);
    }

    if (css) {
      fs.watchFile(css, { interval: 100 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log('CSS file changed, reloading...');
          reloadCSS(css);
        }
      });
      console.log(`👀 Watching CSS: ${path.basename(css)}`);
    }
  });

  console.log('✅ CSS hot-reloading enabled');
}

function injectCSSFiles(window) {
  const cssFiles = [
    path.join(__dirname, '..', 'styles', 'kizuku-palette.css'),
    path.join(__dirname, '..', 'styles', 'desktop.css'),
    path.join(__dirname, '..', 'styles', 'loading.css'),
    path.join(__dirname, '..', 'styles', 'kizuku-branding.css'),
  ];

  try {
    cssFiles.forEach((cssPath) => {
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      const fileName = path.basename(cssPath);
      const safeFileName = JSON.stringify(fileName);
      const safeCSS = JSON.stringify(cssContent);

      const script = `
        (function() {
          var style = document.createElement('style');
          style.setAttribute('data-file', ${safeFileName});
          style.textContent = ${safeCSS};
          document.head.appendChild(style);
        })();
      `;
      window.webContents.executeJavaScript(script);
    });
  } catch (cssError) {
    console.error('Failed to load CSS file:', cssError);
  }
}

module.exports = {
  setMainWindow,
  setupCSSHotReloading,
  injectCSSFiles,
  reloadCSS,
  compileSCSS,
};
