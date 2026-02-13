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
 * Start import
 */
// eslint-disable-next-line max-statements
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

  // Enable minimalist mode
  const container = document.querySelector('.import-container');
  container.classList.add('importing');

  // Show progress view
  const progressView = document.getElementById('progressView');
  progressView.classList.add('visible');

  // Hide drop zone and file list
  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('fileList').style.display = 'none';

  // Get import options
  const options = {
    importAsLibrary: document.getElementById('optionComponents').checked,
    preserveNames: document.getElementById('optionPreserveNames').checked,
    convertPrototyping: document.getElementById('optionPrototyping').checked,
  };

  try {
    // Import files one by one
    let lastImportedFilePath = null;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];

      updateProgressDetails(`Importing ${file.name} (${i + 1}/${validFiles.length})...`);

      const result = await window.electronAPI.figmaAPI.importFile(file.path, options);

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      // Store the last imported file path for auto-open
      if (result.filePath) {
        lastImportedFilePath = result.filePath;
      }

      // Update progress
      const progress = ((i + 1) / validFiles.length) * 100;
      updateProgressBar(progress);
    }

    // Success
    showStatus(`Successfully imported ${validFiles.length} file(s)!`, 'success');

    // Auto-open the imported file (use the last one if multiple)
    if (lastImportedFilePath) {
      console.log('🚀 Auto-opening imported file:', lastImportedFilePath);
      showStatus('Loading project into workspace...', 'info');

      try {
        // First, load the project into backend service manager
        console.log('📂 Loading project into backend...', lastImportedFilePath);
        const loadResult = await window.electronAPI.backend.project.load(lastImportedFilePath);
        console.log('✅ Project loaded into backend:', loadResult);

        // Now launch the workspace
        console.log('🚀 Launching workspace...');
        const launchResult = await window.electronAPI.launchWorkspace(lastImportedFilePath);
        console.log('✅ Workspace launched successfully', launchResult);

        if (!launchResult || !launchResult.success) {
          console.error('❌ Launch workspace returned error:', launchResult);
          showStatus(`File imported but failed to open: ${launchResult?.error || 'Unknown error'}`, 'error');
          return; // Don't close modal if auto-open failed
        }
      } catch (error) {
        console.error('❌ Failed to auto-open file:', error);
        showStatus(`File imported but failed to open: ${error.message}`, 'error');
        return; // Don't close modal if there was an error
      }
    }

    // Close modal after a brief delay to show success message
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    console.error('Import error:', error);
    showStatus(`Import failed: ${error.message}`, 'error');

    // Reset UI
    importing = false;
    updateImportButton();
    progressView.classList.remove('visible');
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('fileList').style.display = 'block';
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
