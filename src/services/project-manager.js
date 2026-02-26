const fs = require('node:fs').promises;
const path = require('node:path');
const { app } = require('electron');
const { createLogger } = require('../utils/logger');

const logger = createLogger('ProjectManager');

const KIZUKU_VERSION = '1.0.0';
const PROJECT_TYPE = 'kizuku-project';

/**
 * Project Manager
 * Handles .kizuku file operations: create, load, save, validate
 */
class ProjectManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.currentProject = null;
    this.projectPath = null;
  }

  /**
   * Create a new empty project
   */
  createProject(metadata = {}) {
    const project = this._buildProjectStructure(metadata);
    this.currentProject = project;
    this.projectPath = null;

    logger.info('Project created', { id: project.metadata.id, name: project.metadata.name });
    return project;
  }

  _buildProjectStructure(metadata) {
    const now = new Date().toISOString();
    const projectId = this._generateId();

    return {
      version: KIZUKU_VERSION,
      type: PROJECT_TYPE,
      metadata: this._buildMetadata(metadata, projectId, now),
      settings: this._getDefaultSettings(),
      data: this._getEmptyData(),
      assets: this._getEmptyAssets(),
      history: this._getEmptyHistory(),
    };
  }

  _buildMetadata(metadata, projectId, now) {
    return {
      id: projectId,
      ...this._getMetadataFields(metadata),
      created: now,
      modified: now,
      license: this.configManager.get('licenseType'),
    };
  }

  _getMetadataFields(metadata) {
    const defaults = {
      name: 'Untitled Project',
      description: '',
      author: this._getDefaultAuthor(),
      tags: [],
      customData: {},
    };

    return { ...defaults, ...metadata };
  }

  /**
   * Load project from file
   */
  async loadProject(filePath) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const project = JSON.parse(fileContent);

      this._validateProject(project);

      this.currentProject = project;
      this.projectPath = filePath;

      logger.info('Project loaded', { path: filePath, name: project.metadata.name });
      return project;
    } catch (error) {
      logger.error('Failed to load project', { path: filePath, error });
      throw new Error(`Failed to load project: ${error.message}`);
    }
  }

  /**
   * Save current project to file
   */
  async saveProject(filePath = null) {
    this._validateSaveConditions(filePath);
    return this._writeProjectFile(filePath);
  }

  _validateSaveConditions(filePath) {
    if (!this.currentProject) {
      throw new Error('No project loaded');
    }

    const targetPath = filePath || this.projectPath;
    if (!targetPath) {
      throw new Error('No file path specified');
    }
  }

  async _writeProjectFile(filePath) {
    const targetPath = filePath || this.projectPath;

    try {
      this.currentProject.metadata.modified = new Date().toISOString();
      const json = JSON.stringify(this.currentProject, null, 2);
      await fs.writeFile(targetPath, json, 'utf-8');

      this.projectPath = targetPath;
      logger.info('Project saved', { path: targetPath });
      return targetPath;
    } catch (error) {
      logger.error('Failed to save project', { path: targetPath, error });
      throw new Error(`Failed to save project: ${error.message}`);
    }
  }

  /**
   * Get current project
   */
  getCurrentProject() {
    return this.currentProject;
  }

  /**
   * Get current project path
   */
  getCurrentProjectPath() {
    return this.projectPath;
  }

  /**
   * Close current project
   */
  closeProject() {
    this.currentProject = null;
    this.projectPath = null;
    logger.info('Project closed');
  }

  /**
   * Get default projects directory
   */
  getProjectsDirectory() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'projects');
  }

  /**
   * List recent projects
   */
  async listRecentProjects(limit = 10) {
    const projectsDir = this.getProjectsDirectory();

    try {
      await fs.mkdir(projectsDir, { recursive: true });
      const files = await fs.readdir(projectsDir);
      const kizukuFiles = files.filter((f) => f.endsWith('.kizuku'));

      const projects = await this._readProjectFiles(projectsDir, kizukuFiles, limit);
      return this._sortProjectsByDate(projects, limit);
    } catch (error) {
      logger.error('Failed to list projects', { error });
      return [];
    }
  }

  async _readProjectFiles(projectsDir, files, limit) {
    const projects = [];

    for (const file of files.slice(0, limit)) {
      const projectInfo = await this._readProjectInfo(projectsDir, file);
      if (projectInfo) {
        projects.push(projectInfo);
      }
    }

    return projects;
  }

  async _readProjectInfo(projectsDir, file) {
    try {
      const filePath = path.join(projectsDir, file);
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const project = JSON.parse(content);

      return {
        path: filePath,
        name: project.metadata.name,
        modified: project.metadata.modified,
        size: stats.size,
      };
    } catch (error) {
      logger.warn('Failed to read project', { file, error: error.message });
      return null;
    }
  }

  _sortProjectsByDate(projects, limit) {
    projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    return projects.slice(0, limit);
  }

  /**
   * Validate project structure
   */
  _validateProject(project) {
    this._validateBasicStructure(project);
    this._validateProjectType(project);
    this._validateMetadata(project);
    this._validateVersion(project);
  }

  _validateBasicStructure(project) {
    if (!project.version || !project.type) {
      throw new Error('Invalid project structure: missing version or type');
    }
  }

  _validateProjectType(project) {
    if (project.type !== PROJECT_TYPE) {
      throw new Error(`Invalid project type: expected ${PROJECT_TYPE}, got ${project.type}`);
    }
  }

  _validateMetadata(project) {
    if (!project.metadata?.id || !project.metadata?.name) {
      throw new Error('Invalid project metadata');
    }
  }

  _validateVersion(project) {
    const [major] = project.version.split('.').map(Number);
    const [currentMajor] = KIZUKU_VERSION.split('.').map(Number);

    if (major !== currentMajor) {
      throw new Error(`Incompatible project version: ${project.version}`);
    }
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get default author info
   */
  _getDefaultAuthor() {
    return {
      name: 'Anonymous',
      email: '',
    };
  }

  /**
   * Get default settings
   */
  _getDefaultSettings() {
    return {
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
      },
      grid: {
        enabled: true,
        size: 8,
        color: '#e0e0e0',
      },
      units: 'px',
    };
  }

  /**
   * Get empty data structure
   */
  _getEmptyData() {
    return {
      pages: [],
      components: [],
      colorLibrary: [],
      typographyLibrary: [],
    };
  }

  /**
   * Get empty assets structure
   */
  _getEmptyAssets() {
    return {
      images: [],
      fonts: [],
      media: [],
    };
  }

  /**
   * Get empty history structure
   */
  _getEmptyHistory() {
    return {
      enabled: true,
      maxEntries: 100,
      entries: [],
    };
  }
}

module.exports = ProjectManager;
