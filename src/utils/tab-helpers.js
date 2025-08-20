/**
 * Tab functionality helpers - broken out to keep main.js under 500 lines
 */

// Helper function to create header bar elements
function createHeaderElements() {
  return `
    const container = document.createElement('div');
    container.className = 'desktop-tabs__container';
    container.id = 'desktop-tab-container';
    
    const leftDrag = document.createElement('div');
    leftDrag.className = 'desktop-tabs__drag-left';
    
    const tabBar = document.createElement('div');
    tabBar.className = 'desktop-tabs__bar';
    tabBar.id = 'desktop-tab-bar';
    
    const centerDrag = document.createElement('div');
    centerDrag.className = 'desktop-tabs__drag-center';
    
    const rightDrag = document.createElement('div');
    rightDrag.className = 'desktop-tabs__drag-right';
  `;
}

// Helper function to create header bar structure JS
function createHeaderBarJS() {
  const elementsJS = createHeaderElements();
  
  return `
    console.log('🎨 Creating structured header bar');
    
    const existing = document.getElementById('desktop-tab-container');
    if (existing) existing.remove();
    
    ${elementsJS}
    
    container.appendChild(leftDrag);
    container.appendChild(tabBar);
    container.appendChild(centerDrag);
    container.appendChild(rightDrag);
    
    document.body.classList.add('has-desktop-tabs');
    document.body.appendChild(container);
    
    console.log('✅ Header bar created with tab functionality');
  `;
}

// Helper function to create tab element JS
function createTabElementJS() {
  return `
    tabs.forEach(tab => {
      const tabElement = document.createElement('div');
      tabElement.className = 'desktop-tabs__tab' + 
        (tab.isActive ? ' desktop-tabs__tab--active' : '');
      tabElement.setAttribute('data-tab-id', tab.id);
      
      const tabName = document.createElement('div');
      tabName.className = 'desktop-tabs__tab-name';
      tabName.textContent = tab.name;
      tabName.title = tab.name;
      
      const tabClose = document.createElement('div');
      tabClose.className = 'desktop-tabs__tab-close';
      tabClose.textContent = '×';
  `;
}

// Helper function to create tab event handlers JS
function createTabEventJS() {
  return `
      tabName.addEventListener('click', () => {
        if (window.electronAPI) {
          window.electronAPI.switchTab(tab.id);
        }
      });
      
      tabClose.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.electronAPI) {
          window.electronAPI.removeTab(tab.id);
        }
      });
      
      tabElement.appendChild(tabName);
      tabElement.appendChild(tabClose);
      tabBar.appendChild(tabElement);
    });
  `;
}

// Helper function to generate update tabs display JavaScript code
function createUpdateTabsJS() {
  const tabElementJS = createTabElementJS();
  const tabEventJS = createTabEventJS();

  return `
    window.updateTabsDisplay = function(tabs) {
      console.log('📋 Updating tabs display:', tabs);
      const tabBar = document.getElementById('desktop-tab-bar');
      if (!tabBar) return;
      
      tabBar.innerHTML = '';
      
      ${tabElementJS}
      ${tabEventJS}
    };
  `;
}

// Helper function to create tab functionality JS
function createTabFunctionalityJS() {
  const updateTabsJS = createUpdateTabsJS();

  return `
    ${updateTabsJS}
    
    if (window.electronAPI) {
      window.electronAPI.onTabsUpdated(window.updateTabsDisplay);
      
      window.electronAPI.getTabs().then(tabs => {
        console.log('🔄 Restoring tabs on startup:', tabs);
        if (tabs.length > 0) {
          window.updateTabsDisplay(tabs);
          
          const activeTab = tabs.find(tab => tab.isActive);
          if (activeTab && activeTab.url && window.location.href !== activeTab.url) {
            console.log('🔄 Navigating to active tab:', activeTab.name);
            window.location.href = activeTab.url;
          }
        }
      });
    }
  `;
}

// Helper function to create header bar
function createHeaderBar(window) {
  setTimeout(() => {
    if (window && !window.isDestroyed()) {
      const headerJS = createHeaderBarJS();
      const tabJS = createTabFunctionalityJS();
      const fullJS = headerJS + tabJS;

      window.webContents
        .executeJavaScript(fullJS)
        .catch((err) => console.log('Header creation failed, but app should still work:', err));
    }
  }, 1000);
}

module.exports = {
  createHeaderBar,
};