/**
 * License Selection Screen Logic
 *
 * Handles user interaction for choosing between Private/Individual
 * and Business/Collaborative license types.
 *
 * @module license-selection
 */

const { ipcRenderer } = require('electron');

// State (used for future enhancement tracking)
// eslint-disable-next-line no-unused-vars
let selectedType = null;

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Private license button
  const privateBtn = document.querySelector('[data-action="select-private"]');
  if (privateBtn) {
    privateBtn.addEventListener('click', handlePrivateSelection);
  }

  // Business license button
  const businessBtn = document.querySelector('[data-action="select-business"]');
  if (businessBtn) {
    businessBtn.addEventListener('click', handleBusinessSelection);
  }

  // Compare link
  const compareLink = document.getElementById('compare-link');
  if (compareLink) {
    compareLink.addEventListener('click', handleCompareClick);
  }

  // Card click selection
  const cards = document.querySelectorAll('.license-card');
  cards.forEach((card) => {
    card.addEventListener('click', handleCardClick);
  });
}

/**
 * Handle private license selection
 */
function handlePrivateSelection(event) {
  event.stopPropagation();
  selectedType = 'private';

  // Send selection to main process
  ipcRenderer.send('license-type-selected', {
    type: 'private',
    timestamp: new Date().toISOString(),
  });

  // Visual feedback
  showSelectionFeedback('private');
}

/**
 * Handle business license selection
 */
function handleBusinessSelection(event) {
  event.stopPropagation();
  selectedType = 'business';

  // Show coming soon notification
  showComingSoonNotification();
}

/**
 * Handle card click (highlight but don't select)
 */
function handleCardClick(event) {
  const card = event.currentTarget;
  const type = card.getAttribute('data-type');

  // Don't highlight if business (disabled)
  if (type === 'business') {
    return;
  }

  // Remove previous highlights
  document.querySelectorAll('.license-card').forEach((c) => {
    c.classList.remove('selected');
  });

  // Add highlight
  card.classList.add('selected');
}

/**
 * Handle compare link click
 */
function handleCompareClick(event) {
  event.preventDefault();
  showComparisonModal();
}

/**
 * Show selection feedback
 */
function showSelectionFeedback(type) {
  const card = document.querySelector(`.license-card[data-type="${type}"]`);
  if (!card) {
    return;
  }

  card.classList.add('selected');

  // Add loading state to button
  const button = card.querySelector('button');
  if (button) {
    button.textContent = 'Loading...';
    button.disabled = true;
  }
}

/**
 * Show coming soon notification
 */
function showComingSoonNotification() {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'notification notification-info';
  notification.innerHTML = `
    <div class="notification-content">
      <strong>Business License Coming Soon</strong>
      <p>
        We're working hard on bringing team collaboration features to Kizu.
        Enter your email to be notified when it's available.
      </p>
      <div class="notification-actions">
        <input
          type="email"
          placeholder="your@email.com"
          class="notification-input"
          id="notify-email"
        />
        <button class="btn btn-primary btn-sm" id="notify-submit">
          Notify Me
        </button>
        <button class="btn btn-secondary btn-sm" id="notify-cancel">
          Cancel
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Handle submit
  document.getElementById('notify-submit').addEventListener('click', () => {
    const email = document.getElementById('notify-email').value;
    if (validateEmail(email)) {
      ipcRenderer.send('business-notify-request', { email });
      closeNotification(notification);
      showSuccessMessage("Thanks! We'll notify you when it's ready.");
    } else {
      showError('Please enter a valid email address');
    }
  });

  // Handle cancel
  document.getElementById('notify-cancel').addEventListener('click', () => {
    closeNotification(notification);
  });
}

/**
 * Create comparison table HTML
 */
function createComparisonTableHTML() {
  return `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Feature</th>
          <th>Private</th>
          <th>Business</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Full Design Tools</td>
          <td class="check">✓</td>
          <td class="check">✓</td>
        </tr>
        <tr>
          <td>Local Storage</td>
          <td class="check">✓</td>
          <td class="check">✓</td>
        </tr>
        <tr>
          <td>Cloud Storage</td>
          <td class="cross">✗</td>
          <td class="check">✓</td>
        </tr>
        <tr>
          <td>Real-time Collaboration</td>
          <td class="cross">✗</td>
          <td class="check">✓</td>
        </tr>
        <tr>
          <td>Team Management</td>
          <td class="cross">✗</td>
          <td class="check">✓</td>
        </tr>
        <tr>
          <td>Priority Support</td>
          <td class="cross">✗</td>
          <td class="check">✓</td>
        </tr>
        <tr>
          <td>Pricing</td>
          <td>One-time</td>
          <td>Monthly</td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Create modal element
 */
function createModalElement() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>Compare License Types</h3>
        <button class="modal-close" id="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${createComparisonTableHTML()}
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="modal-ok">Got It</button>
      </div>
    </div>
  `;
  return modal;
}

/**
 * Setup modal close handlers
 */
function setupModalCloseHandlers(modal) {
  const closeModal = () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  };

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-ok').addEventListener('click', closeModal);
  modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

/**
 * Show comparison modal
 */
function showComparisonModal() {
  const modal = createModalElement();
  document.body.appendChild(modal);

  // Animate in
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);

  setupModalCloseHandlers(modal);
}

/**
 * Close notification
 */
function closeNotification(notification) {
  notification.classList.remove('show');
  setTimeout(() => {
    notification.remove();
  }, 300);
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

/**
 * Validate email address
 */
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Check for existing license on load
 */
async function checkExistingLicense() {
  try {
    const result = await ipcRenderer.invoke('check-license-status');

    if (result.hasValidLicense) {
      // User already has a license, skip this screen
      ipcRenderer.send('skip-license-selection', {
        reason: 'existing-license',
        type: result.type,
      });
    }
  } catch {
    // Silently fail if license check fails
  }
}

/**
 * Initialize screen
 */
function initialize() {
  initializeEventListeners();
  checkExistingLicense();

  // Add CSS for dynamic elements (notification, modal, toast)
  injectDynamicStyles();
}

/**
 * Get notification styles CSS
 */
function getNotificationStyles() {
  return `
    .notification {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: 12px; padding: 2rem; max-width: 500px; width: 90%;
      box-shadow: var(--shadow-lg); opacity: 0; transition: all 0.3s ease;
      z-index: 1000;
    }
    .notification.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    .notification-content strong { display: block; font-size: 1.25rem; margin-bottom: 0.5rem; }
    .notification-content p { color: var(--color-text-secondary); margin-bottom: 1.5rem; }
    .notification-actions { display: flex; flex-direction: column; gap: 0.75rem; }
    .notification-input {
      width: 100%; padding: 0.75rem; background: var(--color-surface-elevated);
      border: 1px solid var(--color-border); border-radius: 6px;
      color: var(--color-text-primary); font-size: 1rem;
    }
    .notification-input:focus { outline: none; border-color: var(--color-primary); }
    .btn-sm { padding: 0.625rem 1rem; font-size: 0.875rem; }
  `;
}

/**
 * Get modal styles CSS
 */
function getModalStyles() {
  return `
    .modal {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.3s ease; z-index: 2000;
    }
    .modal.show { opacity: 1; }
    .modal-overlay {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.7);
    }
    .modal-content {
      position: relative; background: var(--color-surface);
      border: 1px solid var(--color-border); border-radius: 12px;
      max-width: 600px; width: 90%; max-height: 80vh; overflow: auto;
      box-shadow: var(--shadow-lg); transform: scale(0.9);
      transition: transform 0.3s ease;
    }
    .modal.show .modal-content { transform: scale(1); }
    .modal-header {
      padding: 1.5rem; border-bottom: 1px solid var(--color-border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .modal-header h3 { margin: 0; font-size: 1.5rem; }
    .modal-close {
      background: none; border: none; color: var(--color-text-secondary);
      font-size: 2rem; cursor: pointer; padding: 0; width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; transition: all 0.2s ease;
    }
    .modal-close:hover {
      background: var(--color-surface-elevated);
      color: var(--color-text-primary);
    }
    .modal-body { padding: 1.5rem; }
    .modal-footer {
      padding: 1.5rem; border-top: 1px solid var(--color-border);
      display: flex; justify-content: flex-end;
    }
  `;
}

/**
 * Get table and toast styles CSS
 */
function getTableAndToastStyles() {
  return `
    .comparison-table { width: 100%; border-collapse: collapse; }
    .comparison-table th, .comparison-table td {
      padding: 0.75rem; text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    .comparison-table th { font-weight: 600; color: var(--color-primary); }
    .comparison-table td.check {
      color: var(--color-success); text-align: center; font-size: 1.25rem;
    }
    .comparison-table td.cross {
      color: var(--color-text-muted); text-align: center; font-size: 1.25rem;
    }
    .toast {
      position: fixed; bottom: 2rem; right: 2rem;
      padding: 1rem 1.5rem; border-radius: 8px; box-shadow: var(--shadow-lg);
      opacity: 0; transform: translateY(20px); transition: all 0.3s ease;
      z-index: 3000; max-width: 400px;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast-success { background: var(--color-success); color: white; }
    .toast-error { background: #f44336; color: white; }
    .license-card.selected {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
    }
  `;
}

/**
 * Inject dynamic element styles
 */
function injectDynamicStyles() {
  const style = document.createElement('style');
  const notificationCSS = getNotificationStyles();
  const modalCSS = getModalStyles();
  const tableToastCSS = getTableAndToastStyles();

  style.textContent = notificationCSS + modalCSS + tableToastCSS;
  document.head.appendChild(style);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
