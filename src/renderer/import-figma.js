/**
 * Import Figma Modal Controller
 * Handles UI for importing Figma files into Kizu
 */

const selectedFiles = [];
let importing = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeUI();
  setupEventListeners();
});

/**
 * Initialize UI state
 */
function initializeUI() {
  console.log('Import Figma modal initialized');
  updateImportButton();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  // Click to select files
  dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.closest('.drop-zone-icon, .drop-zone-text')) {
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files);
  });

  // Drag and drop
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);

  // Listen for progress updates
  if (window.electronAPI && window.electronAPI.figmaAPI) {
    window.electronAPI.figmaAPI.onImportProgress((progress) => {
      updateProgress(progress);
    });

    window.electronAPI.figmaAPI.onImportStatus((status) => {
      updateStatus(status);
    });
  }
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drag-over');
}

/**
 * Handle drag leave
 */
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');
}

/**
 * Handle drop
 */
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');

  const files = e.dataTransfer.files;
  handleFileSelect(files);
}

/**
 * Handle file selection
 */
async function handleFileSelect(files) {
  if (!files || files.length === 0) {
    return;
  }

  // Convert FileList to Array
  const fileArray = Array.from(files);

  // Filter valid file types
  const validExtensions = ['.kizu', '.json', '.fig'];
  const validFiles = fileArray.filter((file) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    return validExtensions.includes(ext);
  });

  if (validFiles.length === 0) {
    showStatus('Please select .kizu, .json, or .fig files', 'error');
    return;
  }

  // Add files to selection
  for (const file of validFiles) {
    if (!selectedFiles.find((f) => f.path === file.path)) {
      const fileInfo = {
        name: file.name,
        path: file.path,
        size: file.size,
        status: 'validating',
        error: null,
      };

      selectedFiles.push(fileInfo);
      await validateFile(fileInfo);
    }
  }

  renderFileList();
  updateImportButton();
}

/**
 * Validate file
 */
async function validateFile(fileInfo) {
  try {
    const result = await window.electronAPI.figmaAPI.validateFile(fileInfo.path);

    if (result.success) {
      fileInfo.status = 'valid';
      fileInfo.sizeFormatted = formatFileSize(result.size);
    } else {
      fileInfo.status = 'error';
      fileInfo.error = result.error;
    }
  } catch (error) {
    fileInfo.status = 'error';
    fileInfo.error = error.message || 'Validation failed';
  }

  renderFileList();
  updateImportButton();
}

/**
 * Render file list
 */
function renderFileList() {
  const fileListEl = document.getElementById('fileList');
  const fileItemsEl = document.getElementById('fileItems');
  const fileCountEl = document.getElementById('fileCount');

  if (selectedFiles.length === 0) {
    fileListEl.classList.remove('visible');
    return;
  }

  fileListEl.classList.add('visible');
  fileCountEl.textContent = selectedFiles.length;

  fileItemsEl.innerHTML = selectedFiles
    .map(
      (file, index) => `
    <div class="file-item ${file.status === 'error' ? 'error' : ''}">
      <div class="file-info">
        <div class="file-icon">${getFileIcon(file.name)}</div>
        <div class="file-details">
          <div class="file-name">${escapeHtml(file.name)}</div>
          <div class="file-meta">${file.sizeFormatted || 'Validating...'}</div>
          ${file.error ? `<div class="file-meta" style="color: #c62828;">${escapeHtml(file.error)}</div>` : ''}
        </div>
      </div>
      <div class="file-status ${file.status}">${getStatusText(file.status)}</div>
      <button class="file-remove" onclick="removeFile(${index})" title="Remove">×</button>
    </div>
  `
    )
    .join('');
}

/**
 * Remove file from selection
 */
function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
  updateImportButton();
}

/**
 * Get file icon
 */
function getFileIcon(fileName) {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (ext === '.fig') {
    return '🎨';
  }
  if (ext === '.json') {
    return '📄';
  }
  if (ext === '.kizu') {
    return '📦';
  }
  return '📄';
}

/**
 * Get status text
 */
function getStatusText(status) {
  switch (status) {
    case 'validating':
      return 'Validating...';
    case 'valid':
      return '✓ Ready';
    case 'error':
      return '✗ Error';
    default:
      return status;
  }
}

/**
 * Update import button state
 */
function updateImportButton() {
  const importBtn = document.getElementById('importBtn');
  const validFiles = selectedFiles.filter((f) => f.status === 'valid');

  importBtn.disabled = validFiles.length === 0 || importing;
  importBtn.textContent = `Import ${validFiles.length > 0 ? `(${validFiles.length})` : 'Files'}`;
}

/**
 * Show importing UI state (progress view, hide drop zone)
 */
function showImportingUI() {
  document.querySelector('.import-container').classList.add('importing');
  document.getElementById('progressView').classList.add('visible');
  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('fileList').style.display = 'none';
}

/**
 * Reset import UI after failure
 */
function resetImportUI() {
  importing = false;
  updateImportButton();
  document.getElementById('progressView').classList.remove('visible');
  document.getElementById('dropZone').style.display = 'block';
  document.getElementById('fileList').style.display = 'block';
}

/**
 * Import files sequentially with progress updates
 * @param {array} files - Valid files to import
 * @param {object} options - Import options
 * @returns {Promise<string|null>} Last imported file path
 */
async function importFiles(files, options) {
  let lastPath = null;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    updateProgressDetails(`Importing ${file.name} (${i + 1}/${files.length})...`);

    const result = await window.electronAPI.figmaAPI.importFile(file.path, options);
    if (!result.success) {
      throw new Error(result.error || 'Import failed');
    }
    if (result.filePath) {
      lastPath = result.filePath;
    }
    updateProgressBar(((i + 1) / files.length) * 100);
  }

  return lastPath;
}

/**
 * Auto-open imported file in workspace
 * @param {string} filePath - Path to imported file
 * @returns {Promise<boolean>} True if opened successfully
 */
async function autoOpenImportedFile(filePath) {
  console.log('🚀 Auto-opening imported file:', filePath);
  showStatus('Loading project into workspace...', 'info');

  const loadResult = await window.electronAPI.backend.project.load(filePath);
  console.log('✅ Project loaded into backend:', loadResult);

  const launchResult = await window.electronAPI.launchWorkspace(filePath);
  if (!launchResult?.success) {
    const msg = launchResult?.error || 'Unknown error';
    showStatus(`File imported but failed to open: ${msg}`, 'error');
    return false;
  }
  return true;
}

/**
 * Start import process
 */
async function startImport() {
  if (importing) {
    return;
  }

  const validFiles = selectedFiles.filter((f) => f.status === 'valid');
  if (validFiles.length === 0) {
    showStatus('No valid files to import', 'error');
    return;
  }

  importing = true;
  updateImportButton();
  showImportingUI();

  const options = {
    importAsLibrary: document.getElementById('optionComponents').checked,
    preserveNames: document.getElementById('optionPreserveNames').checked,
    convertPrototyping: document.getElementById('optionPrototyping').checked,
  };

  try {
    const lastPath = await importFiles(validFiles, options);
    showStatus(`Successfully imported ${validFiles.length} file(s)!`, 'success');

    if (lastPath) {
      const opened = await autoOpenImportedFile(lastPath);
      if (!opened) {
        return;
      }
    }
    setTimeout(() => window.close(), 1000);
  } catch (error) {
    console.error('Import error:', error);
    showStatus(`Import failed: ${error.message}`, 'error');
    resetImportUI();
  }
}

/**
 * Update progress
 */
function updateProgress(progress) {
  const percentage = Math.round(progress.percentage || 0);
  updateProgressBar(percentage);

  if (progress.currentItem) {
    updateProgressDetails(`Processing: ${progress.currentItem}`);
  }

  updateProgressStatus(
    `${progress.processedItems || 0} of ${progress.totalItems || 0} items processed`
  );
}

/**
 * Update status
 */
function updateStatus(status) {
  console.log('Import status:', status);
  updateProgressStatus(`Status: ${status}`);
}

/**
 * Update progress bar
 */
function updateProgressBar(percentage) {
  const progressBar = document.getElementById('progressBar');
  const progressPercentage = document.getElementById('progressPercentage');

  progressBar.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;
}

/**
 * Update progress details
 */
function updateProgressDetails(text) {
  document.getElementById('progressDetails').textContent = text;
}

/**
 * Update progress status
 */
function updateProgressStatus(text) {
  document.getElementById('progressStatus').textContent = text;
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type} visible`;

  setTimeout(() => {
    statusEl.classList.remove('visible');
  }, 5000);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for inline event handlers
window.removeFile = removeFile;
window.startImport = startImport;
