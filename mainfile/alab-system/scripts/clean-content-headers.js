/* eslint-disable */
// Script to remove duplicated header/nav from resident content files
const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '..', 'app', '_content');

const files = [
  'resident-guide-content.ts',
  'resident-reports-content.ts',
  'resident-profile-content.ts',
  'resident-report-fire-content.ts',
];

for (const file of files) {
  const filePath = path.join(contentDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // ===== REMOVE DESKTOP HEADER CSS =====
  // Remove header-related CSS blocks (top-header, header-left, header-nav, nav-item, etc.)
  // These are between "/* HEADER */" or "/* GLOBAL HEADER */" and "/* MAIN " or the next major section
  
  // Pattern 1: Remove all header-related CSS properties
  const headerCssPatterns = [
    /\s*\/\*\s*={3,}\s*(?:GLOBAL )?HEADER.*?={3,}\s*\*\/[\s\S]*?(?=\s*\/\*\s*={3,})/g,
    /\s*\/\*\s*={3,}\s*HEADER PROFILE DROPDOWN\s*={3,}\s*\*\/[\s\S]*?(?=\s*\/\*\s*(?:={3,}|MAIN|MOBILE))/g,
  ];
  
  // Simpler approach: remove CSS blocks by class name
  const headerClasses = [
    '.top-header',
    '.header-left',
    '.brand-logo',
    '.brand-title',
    '.brand-subtitle',
    '.header-nav',
    '.nav-item-wrapper',
    '.nav-item:hover',
    '.nav-item.active::after',
    '.nav-item.active',
    '.nav-item.report-fire-nav .nav-icon',
    '.nav-item.report-fire-nav',
    '.nav-item',
    '.nav-icon',
    '.fire-logo-tint',
    '.header-right',
    '.notification-btn, .lang-btn',
    '.notification-btn:hover, .lang-btn:hover',
    '.notification-badge',
    '.header-profile-menu',
    '.header-profile-btn:hover',
    '.header-profile-btn img',
    '.header-profile-btn',
    '.profile-dropdown',
    '.header-profile-menu:focus-within',
    '.header-profile-menu:hover',
    '.profile-dropdown-item:hover',
    '.profile-dropdown-item',
    '.profile-dropdown-icon',
    '.profile-dropdown-divider',
    '.mobile-bottom-nav { display: none',
    '.mobile-top-header { display: none',
  ];
  
  // ===== REMOVE HEADER MARKUP from the HTML =====
  // Remove everything from <!-- MOBILE TOP HEADER --> through </header> for the desktop header
  // and the mobile bottom nav
  
  // Remove mobile-top-header block
  content = content.replace(
    /\s*<!-- MOBILE TOP HEADER -->[\s\S]*?<\/header>/g,
    ''
  );
  
  // Remove the desktop top-header block  
  content = content.replace(
    /\s*(?:<!-- GLOBAL HEADER.*?-->|<!-- DESKTOP HEADER.*?-->)?\s*<header class="top-header">[\s\S]*?<\/header>/g,
    ''
  );
  
  // Remove mobile bottom nav
  content = content.replace(
    /\s*(?:<!-- MOBILE BOTTOM NAV(?:IGATION)? -->)?\s*<nav class="mobile-bottom-nav">[\s\S]*?<\/nav>/g,
    ''
  );
  
  // Remove the closing </div> that was wrapping the entire page root only if there's an extra one
  // (the markup files have <div class="xxx-page-root"> ... headers ... <main> ... </main> ... nav ... </div>)
  // After removing headers and nav, we still need the wrapping div

  // ===== REMOVE HEADER/NAV CSS from styles =====
  // Remove the GLOBAL HEADER section
  content = content.replace(
    /\s*\/\*\s*={3,}\s*GLOBAL HEADER[^*]*\*\/[\s\S]*?(?=\s*\/\*\s*={3,}\s*(?!HEADER))/,
    '\n'
  );
  
  // Remove HEADER PROFILE DROPDOWN section  
  content = content.replace(
    /\s*\/\*\s*={3,}\s*HEADER PROFILE DROPDOWN[^*]*\*\/[\s\S]*?(?=\s*\/\*\s*={3,}\s*(?!HEADER))/,
    '\n'
  );

  // Remove standalone HEADER section (for reports-content)
  content = content.replace(
    /\s*\/\*\s*={3,}\s*HEADER\s*={3,}\s*\*\/[\s\S]*?(?=\s*\/\*\s*={3,}\s*HEADER PROFILE)/,
    '\n'
  );
  content = content.replace(
    /\s*\/\*\s*={3,}\s*HEADER PROFILE DROPDOWN\s*={3,}\s*\*\/[\s\S]*?(?=\s*\/\*\s*={3,}\s*(?!HEADER))/,
    '\n'
  );
  
  // Remove .mobile-bottom-nav { display: none; } 
  content = content.replace(
    /\s*\.mobile-bottom-nav\s*\{\s*display:\s*none;?\s*\}/g,
    ''
  );
  
  // Remove .mobile-top-header { display: none; }
  content = content.replace(
    /\s*\.mobile-top-header\s*\{\s*display:\s*none;?\s*\}/g,
    ''
  );
  
  // Remove mobile-specific header styles in @media blocks
  // Remove .top-header { display: none !important; } inside media queries
  content = content.replace(
    /\s*\.top-header\s*\{\s*display:\s*none\s*!important;?\s*\}/g,
    ''
  );
  
  // Remove mobile-top-header styles block inside media queries
  content = content.replace(
    /\s*(?:\/\*\s*Mobile Top Header\s*\*\/)?\s*\.mobile-top-header\s*\{[^}]*display:\s*flex[^}]*\}(?:\s*\.mobile-page-title\s*\{[^}]*\})?(?:\s*\.mobile-notif-btn\s*\{[^}]*\})*(?:\s*\.mobile-notif-btn\s+svg\s*\{[^}]*\})?/g,
    ''
  );
  
  // Remove mobile bottom nav styles inside media queries  
  content = content.replace(
    /\s*(?:\/\*\s*Show mobile bottom nav\s*\*\/\s*)?\s*\.mobile-bottom-nav\s*\{\s*display:\s*flex[\s\S]*?\.mobile-nav-fab\s+span\s*\{[^}]*\}/g,
    ''
  );
  
  // Remove .mobile-top-header { display: flex !important; }
  content = content.replace(
    /\s*\.mobile-top-header\s*\{\s*display:\s*flex\s*!important;?\s*\}/g,
    ''
  );
  
  // Remove desktop-only / mobile-only utility rules
  content = content.replace(
    /\s*\.desktop-only\s*\{\s*display:\s*none\s*!important;?\s*\}/g,
    ''
  );
  content = content.replace(
    /\s*\.mobile-only\s*\{\s*display:\s*block\s*!important;?\s*\}/g,
    ''
  );
  
  // Remove .mobile-bottom-nav { display: none !important; }
  content = content.replace(
    /\s*\.mobile-bottom-nav\s*\{\s*display:\s*none\s*!important;?\s*\}/g,
    ''
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Cleaned: ${file}`);
  } else {
    console.log(`⚠️  No changes: ${file}`);
  }
}

console.log('\nDone!');
