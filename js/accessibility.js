/* =============================================
   UHP v3.0 — Accessibility & Theme Manager
   Handles Light/Dark Theme & Text Size Preferences
   ============================================= */

'use strict';

const THEME_KEY = 'uhp_theme';
const FONT_SIZE_KEY = 'uhp_font_size';

// Apply saved preferences immediately on script load
(function initAccessibility() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  const savedFontSize = localStorage.getItem(FONT_SIZE_KEY) || 'normal';

  // Apply theme to document element (or body if loaded, but documentElement is safer immediately)
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }

  // Apply font size
  if (savedFontSize === 'large') {
    document.documentElement.classList.add('font-large');
  } else {
    document.documentElement.classList.remove('font-large');
  }
})();

// Wait for DOM to register toggle listener bindings
document.addEventListener('DOMContentLoaded', () => {
  updateAccessibilityUI();
});

// Update the UI buttons/toggles to match stored state
function updateAccessibilityUI() {
  const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
  const currentFontSize = localStorage.getItem(FONT_SIZE_KEY) || 'normal';

  // Update theme toggle buttons (can be multiple)
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    if (currentTheme === 'dark') {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <span>Mode Terang</span>
      `;
    } else {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <span>Mode Gelap</span>
      `;
    }
  });

  // Update font size selectors
  document.querySelectorAll('.font-size-select').forEach(select => {
    select.value = currentFontSize;
  });
}

// Global Toggle Functions
window.toggleTheme = function() {
  const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  localStorage.setItem(THEME_KEY, newTheme);
  
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
  
  updateAccessibilityUI();
};

window.setFontSize = function(size) {
  localStorage.setItem(FONT_SIZE_KEY, size);
  
  if (size === 'large') {
    document.documentElement.classList.add('font-large');
  } else {
    document.documentElement.classList.remove('font-large');
  }
  
  updateAccessibilityUI();
};
