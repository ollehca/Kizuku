/**
 * Kizuku File Injector
 * Directly injects .kizuku file data into Penpot's frontend via window global
 * Bypasses database entirely - Penpot loads from window.__KIZU_FILE_DATA__
 */

const { createLogger } = require('../../utils/logger');
const fs = require('fs').promises;
const logger = createLogger('KizukuFileInjector');

class KizukuFileInjector {
  constructor(webviewWindow) {
    this.webviewWindow = webviewWindow;
  }

  /**
   * Load and inject .kizuku file directly into Penpot's window
   * @param {string} kizukuFilePath - Path to .kizuku file
   * @returns {Promise<Object>} - { success, workspaceUrl }
   */
  async injectFile(kizukuFilePath) {
    try {
      logger.info('Loading .kizuku file for injection', { path: kizukuFilePath });

      // Read the .kizuku file
      const fileContent = await fs.readFile(kizukuFilePath, 'utf8');
      const kizukuProject = JSON.parse(fileContent);

      logger.info('Injecting .kizuku data into window global', {
        name: kizukuProject.metadata.name,
        pages: kizukuProject.data.pages?.length || 0,
      });

      // Convert .kizuku data to Penpot's internal format
      const penpotData = this.convertToPenpotFormat(kizukuProject);

      // Inject into webview
      const result = await this.executeInWebview(penpotData, kizukuProject.metadata);

      if (result.success) {
        logger.info('File injected successfully', {
          fileId: result.fileId,
          workspaceUrl: result.workspaceUrl,
        });

        return {
          success: true,
          fileId: result.fileId,
          workspaceUrl: result.workspaceUrl,
        };
      } else {
        throw new Error(result.error || 'Unknown injection error');
      }
    } catch (error) {
      logger.error('Failed to inject file', { error: error.message, path: kizukuFilePath });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Convert .kizuku format to Penpot's internal data structure
   */
  convertToPenpotFormat(kizukuProject) {
    logger.info('Converting .kizuku to Penpot format');

    const fileId = kizukuProject.metadata.id;
    const pagesIndex = {};
    const pageIds = [];

    // Convert pages
    if (kizukuProject.data.pages && kizukuProject.data.pages.length > 0) {
      for (const kizukuPage of kizukuProject.data.pages) {
        const pageId = kizukuPage.id || this.generateUUID();
        pageIds.push(pageId);
        pagesIndex[pageId] = this.convertPage(kizukuPage, pageId);
      }
    } else {
      // Create default empty page
      const defaultPageId = this.generateUUID();
      pageIds.push(defaultPageId);
      pagesIndex[defaultPageId] = this.createEmptyPage(defaultPageId);
    }

    return {
      id: fileId,
      name: kizukuProject.metadata.name || 'Imported Design',
      pages: pageIds,
      'pages-index': pagesIndex,
      components: {},
      media: {},
      colors: {},
      typographies: {},
      options: {
        'components-v2': true,
      },
    };
  }

  /**
   * Convert a .kizuku page to Penpot page format
   */
  convertPage(kizukuPage, pageId) {
    const objects = {};
    const rootId = this.generateUUID();

    // Create root frame
    objects[rootId] = {
      id: rootId,
      type: 'frame',
      name: 'Board',
      shapes: [],
    };

    // Convert children
    if (kizukuPage.children && kizukuPage.children.length > 0) {
      for (const child of kizukuPage.children) {
        const shapeId = child.id || this.generateUUID();
        objects[shapeId] = this.convertShape(child, shapeId);
        objects[rootId].shapes.push(shapeId);
        this.addChildrenToObjects(child, objects);
      }
    }

    return {
      id: pageId,
      name: kizukuPage.name || 'Page 1',
      objects: objects,
      options: {
        background: '#ffffff',
      },
    };
  }

  /**
   * Create empty Penpot page
   */
  createEmptyPage(pageId) {
    const rootId = this.generateUUID();

    return {
      id: pageId,
      name: 'Page 1',
      objects: {
        [rootId]: {
          id: rootId,
          type: 'frame',
          name: 'Board',
          shapes: [],
        },
      },
      options: {
        background: '#ffffff',
      },
    };
  }

  /**
   * Convert shape from .kizuku to Penpot format
   */
  convertShape(kizukuShape, shapeId) {
    const shape = {
      id: shapeId,
      type: kizukuShape.type || 'rect',
      name: kizukuShape.name || 'Shape',
      x: kizukuShape.x || 0,
      y: kizukuShape.y || 0,
      width: kizukuShape.width || 100,
      height: kizukuShape.height || 100,
      rotation: kizukuShape.rotation || 0,
      opacity: kizukuShape.opacity ?? 1,
      'blend-mode': kizukuShape.blendMode || 'normal',
      visible: kizukuShape.visible !== false,
      shapes: [],
    };

    // Add fills
    if (kizukuShape.fills && kizukuShape.fills.length > 0) {
      const firstFill = kizukuShape.fills[0];
      if (firstFill.type === 'color') {
        shape['fill-color'] = firstFill.color || '#000000';
        shape['fill-opacity'] = firstFill.opacity ?? 1;
      }
    }

    // Add strokes
    if (kizukuShape.strokes && kizukuShape.strokes.length > 0) {
      const firstStroke = kizukuShape.strokes[0];
      shape['stroke-color'] = firstStroke.color || '#000000';
      shape['stroke-opacity'] = firstStroke.opacity ?? 1;
      shape['stroke-width'] = kizukuShape.strokeWeight || 1;
    }

    // Type-specific properties
    if (kizukuShape.type === 'text') {
      shape.content = kizukuShape.content || '';
      shape['font-family'] = kizukuShape.fontFamily || 'Work Sans';
      shape['font-size'] = kizukuShape.fontSize || 16;
    }

    if (kizukuShape.type === 'rect' && kizukuShape.rx) {
      shape.rx = kizukuShape.rx;
      shape.ry = kizukuShape.ry || kizukuShape.rx;
    }

    return shape;
  }

  /**
   * Recursively add children to objects map
   */
  addChildrenToObjects(parent, objects) {
    if (parent.children && parent.children.length > 0) {
      const parentId = parent.id;

      for (const child of parent.children) {
        const childId = child.id || this.generateUUID();
        objects[childId] = this.convertShape(child, childId);

        if (objects[parentId]) {
          objects[parentId].shapes.push(childId);
        }

        this.addChildrenToObjects(child, objects);
      }
    }
  }

  /**
   * Inject file data into webview window global and navigate to workspace
   */
  async executeInWebview(penpotData, metadata) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Webview injection timed out after 30 seconds'));
      }, 30000);

      const injectionCode = `
        (async function() {
          try {
            console.log('🔵 Kizuku: Storing file data in window global');
            console.log('🔵 Kizuku: File name:', ${JSON.stringify(metadata.name)});
            console.log('🔵 Kizuku: Pages:', ${penpotData.pages.length});

            const fileData = ${JSON.stringify(penpotData)};
            const fileId = fileData.id;

            // Store in window global for Penpot to read
            window.__KIZU_FILE_DATA__ = fileData;
            console.log('🔵 Kizuku: Data stored in window.__KIZU_FILE_DATA__');

            // Navigate to workspace with kizu-local project ID
            const workspaceUrl = \`http://localhost:3449/#/workspace/kizu-local/\${fileId}\`;
            console.log('🔵 Kizuku: Navigating to:', workspaceUrl);

            window.location.href = workspaceUrl;

            return {
              success: true,
              fileId: fileId,
              workspaceUrl: workspaceUrl
            };
          } catch (error) {
            console.error('🔵 Kizuku: Injection failed:', error);
            return {
              success: false,
              error: error.message
            };
          }
        })();
      `;

      this.webviewWindow.webContents
        .executeJavaScript(injectionCode)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Generate UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Factory function
function createPenpotFrontendInjector(webviewWindow) {
  return new KizukuFileInjector(webviewWindow);
}

module.exports = {
  createPenpotFrontendInjector,
  KizukuFileInjector,
};
