// Script to clear localStorage and force frontend to use fresh JWT token
// Run this in the browser console to clear expired tokens

console.log('Clearing expired JWT token from localStorage...');
localStorage.removeItem('authToken');
console.log('Token cleared. Page will reload with fresh token.');
window.location.reload();
