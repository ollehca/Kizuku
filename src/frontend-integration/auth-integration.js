/**
 * Kizu Private License Auto-Login Integration
 * For private license users - bypasses login and creates session automatically
 */

console.log('🔐 Kizu Private License Auto-Login Integration loaded');

// Guard to prevent multiple initializations
if (!window._kizuAuthIntegrationInitialized) {
  window._kizuAuthIntegrationInitialized = true;

  // Main initialization function
  const initializeAuth = async () => {
    // Check if we're already on the dashboard
    if (window.location.href.includes('/dashboard')) {
      console.log('✅ Already on dashboard');
      return;
    }

    // Check if we're on the login page
    if (window.location.href.includes('/auth/login')) {
      console.log('🔐 Private license detected - bypassing login...');

      // Try to auto-login with demo account
      try {
        const response = await fetch('http://localhost:6060/api/rpc/command/login-with-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/transit+json',
          },
          body: JSON.stringify({
            email: 'demo@penpot.local',
            password: 'demo123',
          }),
        });

        if (response.ok) {
          await response.json(); // Consume response body
          console.log('✅ Auto-login successful, redirecting to dashboard...');
          window.location.href = 'http://localhost:3449/#/dashboard/projects';
        } else {
          console.error('❌ Auto-login failed:', response.status);
        }
      } catch (error) {
        console.error('❌ Auto-login error:', error);
      }
    } else if (!window.location.href.includes('/dashboard')) {
      // Not on login or dashboard - redirect to dashboard
      console.log('🔐 Redirecting to dashboard...');
      window.location.href = 'http://localhost:3449/#/dashboard/projects';
    }
  };

  // Start initialization (with DOM ready check)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
  } else {
    initializeAuth();
  }
} else {
  console.log('⏭️  Auth integration already initialized, skipping');
}
