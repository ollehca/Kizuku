/**
 * Project Dashboard Controller
 * Manages project creation, loading, and recent projects display
 */

const { getBackendClient } = globalThis;
let backendClient;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await initializeDashboard();
  attachEventListeners();
  await loadRecentProjects();
});

async function initializeDashboard() {
  try {
    backendClient = getBackendClient();
    await backendClient.waitForInitialization(10000);
    console.log('Dashboard: Backend services initialized');
  } catch (error) {
    showStatus('Failed to initialize backend services', 'error');
    console.error('Dashboard initialization error:', error);
  }
}

function attachEventListeners() {
  // New project button
  document.getElementById('newProjectBtn').addEventListener('click', openNewProjectModal);

  // Quick action cards
  document.getElementById('createBlankProject').addEventListener('click', openNewProjectModal);
  document.getElementById('openExistingProject').addEventListener('click', openExistingProject);
  document.getElementById('importFromFigma').addEventListener('click', importFromFigma);

  // Settings button (dev-only: theme editor)
  setupSettingsButton();

  // Modal controls
  document.getElementById('cancelBtn').addEventListener('click', closeNewProjectModal);
  document.getElementById('newProjectForm').addEventListener('submit', handleCreateProject);

  // Close modal on overlay click
  const modalOverlay = document.getElementById('newProjectModal');
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeNewProjectModal();
    }
  });
}

function openNewProjectModal() {
  const modal = document.getElementById('newProjectModal');
  modal.classList.add('active');

  // Set default author from backend config
  loadDefaultAuthor();

  // Focus on project name input
  document.getElementById('projectName').focus();
}

function closeNewProjectModal() {
  const modal = document.getElementById('newProjectModal');
  modal.classList.remove('active');

  // Reset form
  document.getElementById('newProjectForm').reset();
}

async function loadDefaultAuthor() {
  try {
    const config = await backendClient.getConfig();
    const authorInput = document.getElementById('authorName');

    if (config.defaultAuthor?.name) {
      authorInput.value = config.defaultAuthor.name;
    }
  } catch (error) {
    console.warn('Could not load default author:', error);
  }
}

async function handleCreateProject(event) {
  event.preventDefault();

  const formData = getFormData();
  if (!formData.name) {
    showStatus('Project name is required', 'error');
    return;
  }

  try {
    await createAndSaveProject(formData);
  } catch (error) {
    showStatus(`Failed to create project: ${error.message}`, 'error');
    console.error('Create project error:', error);
  }
}

function getFormData() {
  return {
    name: document.getElementById('projectName').value.trim(),
    description: document.getElementById('projectDescription').value.trim(),
    authorName: document.getElementById('authorName').value.trim(),
  };
}

function buildProjectMetadata(formData) {
  return {
    name: formData.name,
    description: formData.description || '',
    author: {
      name: formData.authorName || 'Anonymous',
      email: '',
    },
    tags: [],
  };
}

async function createAndSaveProject(formData) {
  showStatus('Creating project...', 'success');

  const metadata = buildProjectMetadata(formData);
  const project = await backendClient.createProject(metadata);
  console.log('Project created:', project);

  const filePath = await showSaveDialog(formData.name);
  await handleProjectSave(filePath);
}

async function handleProjectSave(filePath) {
  if (!filePath) {
    showStatus('Project created but not saved', 'error');
    return;
  }

  await backendClient.saveProject(filePath);
  showStatus('Project created successfully!', 'success');

  closeNewProjectModal();
  await loadRecentProjects();
  setTimeout(() => openProjectInWorkspace(filePath), 1000);
}

async function showSaveDialog(defaultName) {
  try {
    const result = await globalThis.electronAPI.showSaveDialog({
      title: 'Save Project',
      defaultPath: `${defaultName}.kizuku`,
      filters: [
        { name: 'Kizuku Projects', extensions: ['kizuku'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    return result.filePath;
  } catch (error) {
    console.error('Save dialog error:', error);
    return null;
  }
}

async function openExistingProject() {
  try {
    const result = await globalThis.electronAPI.showOpenDialog({
      title: 'Open Project',
      filters: [
        { name: 'Kizuku Projects', extensions: ['kizuku'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.filePaths && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      await loadProject(filePath);
    }
  } catch (error) {
    showStatus(`Failed to open project: ${error.message}`, 'error');
    console.error('Open project error:', error);
  }
}

async function loadProject(filePath) {
  try {
    showStatus('Loading project...', 'success');

    const project = await backendClient.loadProject(filePath);
    console.log('Project loaded:', project);

    showStatus('Project loaded successfully!', 'success');

    // Reload recent projects
    await loadRecentProjects();

    // Open in workspace
    setTimeout(() => openProjectInWorkspace(filePath), 500);
  } catch (error) {
    showStatus(`Failed to load project: ${error.message}`, 'error');
    console.error('Load project error:', error);
  }
}

async function loadRecentProjects() {
  const container = document.getElementById('recentProjectsContainer');

  try {
    const recentProjects = await backendClient.listRecentProjects(12);

    if (recentProjects.length === 0) {
      showEmptyState(container);
      return;
    }

    // Clear container
    container.innerHTML = '';

    // Render project cards
    recentProjects.forEach((project) => {
      const card = createProjectCard(project);
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Failed to load recent projects:', error);
    showEmptyState(container);
  }
}

function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'project-card';

  const lastModified = formatDate(new Date(project.modified));
  const fileSize = formatFileSize(project.size);

  card.innerHTML = `
    <div class="project-thumbnail">🎨</div>
    <div class="project-info">
      <div class="project-name">${escapeHtml(project.name)}</div>
      <div class="project-meta">
        <span>${lastModified}</span>
        <span>${fileSize}</span>
      </div>
    </div>
  `;

  card.addEventListener('click', () => loadProject(project.path));

  return card;
}

function showEmptyState(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📂</div>
      <div class="empty-state-text">No recent projects</div>
      <div class="empty-state-subtext">Create a new project to get started</div>
    </div>
  `;
}

async function openProjectInWorkspace(filePath) {
  console.log('Opening project in workspace:', filePath);

  try {
    showStatus('Opening workspace...', 'success');

    // Call IPC to launch workspace
    const result = await globalThis.electronAPI.launchWorkspace(filePath);

    if (result.success) {
      console.log('Workspace launched:', result.project.name);
      // Close dashboard window after successful launch
      setTimeout(() => globalThis.close(), 500);
    } else {
      showStatus('Failed to launch workspace', 'error');
    }
  } catch (error) {
    showStatus(`Workspace launch error: ${error.message}`, 'error');
    console.error('Workspace launch error:', error);
  }
}

async function importFromFigma() {
  try {
    // Show file picker for Figma files
    const result = await globalThis.electronAPI.showOpenDialog({
      title: 'Import Figma File',
      filters: [
        { name: 'Figma Files', extensions: ['json', 'kizuku', 'fig'] },
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'Kizuku Projects', extensions: ['kizuku'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return;
    }

    // Import each file
    showStatus('Importing files...', 'success');

    for (const filePath of result.filePaths) {
      const importResult = await globalThis.electronAPI.figmaAPI.importFile(filePath, {
        importAsLibrary: true,
        preserveNames: true,
        convertPrototyping: false,
      });

      if (!importResult.success) {
        showStatus(`Import failed: ${importResult.error}`, 'error');
        return;
      }
    }

    showStatus(`Successfully imported ${result.filePaths.length} file(s)!`, 'success');

    // Reload recent projects
    await loadRecentProjects();
  } catch (error) {
    showStatus(`Import error: ${error.message}`, 'error');
    console.error('Import error:', error);
  }
}

/**
 * Show Settings button only in dev mode
 */
async function setupSettingsButton() {
  const btn = document.getElementById('settingsBtn');
  try {
    const devMode = await globalThis.electronAPI.isDevMode();
    if (devMode) {
      btn.addEventListener('click', openSettings);
    } else {
      btn.style.display = 'none';
    }
  } catch {
    btn.style.display = 'none';
  }
}

/**
 * Open theme editor (dev-only)
 */
async function openSettings() {
  try {
    await globalThis.electronAPI.theme.openEditor();
  } catch (error) {
    showStatus('Failed to open theme editor', 'error');
    console.error('Theme editor error:', error);
  }
}

// Utility Functions

function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type} active`;

  setTimeout(() => {
    statusEl.className = 'status-message';
  }, 3000);
}

function formatDate(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString();
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
