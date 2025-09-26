/**
 * Kizu Development Auth Integration
 * Redirects to login page for manual login
 */

console.log('🔐 Kizu Development Auth Integration loaded');

// Simple redirect to login page
if (!window.location.href.includes('/auth/login')) {
  console.log('🔐 Redirecting to login page...');
  window.location.href = 'http://localhost:3449/#/auth/login';
}

console.log('🔐 Ready for manual login with: local@demo.dev / test123');
