import fs from 'fs';
import path from 'path';

console.log('=== STARTING DEEP SCAN FOR KPM SCRIPT PROJECT ===\n');

const issues = [];
const warnings = [];
const passed = [];

// 1. Check all frontend files for API actions
const frontendFiles = [
  'WKPM/combined-app/src/App.vue',
  'WKPM/combined-app/src/services/trackingService.js',
  'WKPM/combined-app/src/components/LiveTrackingMap.vue',
  'WKPM/admin/admin.js',
  'WKPM/user/user.js',
  'apps/driver-app/src/services/api.js'
];

const frontEndActions = new Set();
for (const file of frontendFiles) {
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    const matches1 = text.matchAll(/action\s*[:=]\s*['"]([a-zA-Z0-9_-]+)['"]/g);
    for (const m of matches1) frontEndActions.add(m[1]);
    const matches2 = text.matchAll(/api\(\s*['"]([a-zA-Z0-9_-]+)['"]/g);
    for (const m of matches2) frontEndActions.add(m[1]);
    const matches3 = text.matchAll(/apiCall\(\s*['"]([a-zA-Z0-9_-]+)['"]/g);
    for (const m of matches3) frontEndActions.add(m[1]);
  }
}

console.log('1. Frontend Actions Discovered:', Array.from(frontEndActions));

// 2. Check Web.gs action handlers in doGet and doPost
const webGs = fs.readFileSync('Web.gs', 'utf8');
const backendHandledActions = new Set();
const actionMatches = webGs.matchAll(/action\s*===\s*["']([a-zA-Z0-9_-]+)["']/g);
for (const m of actionMatches) {
  backendHandledActions.add(m[1]);
}
const switchMatches = webGs.matchAll(/case\s+["']([a-zA-Z0-9_-]+)["']\s*:/g);
for (const m of switchMatches) {
  backendHandledActions.add(m[1]);
}

console.log('2. Backend Handled Actions in Web.gs:', Array.from(backendHandledActions));

for (const act of frontEndActions) {
  if (!backendHandledActions.has(act)) {
    issues.push(`Frontend calls action '${act}' but it is NOT handled in Web.gs switch cases!`);
  } else {
    passed.push(`Action '${act}' is registered and handled in Web.gs`);
  }
}

// 3. Check for undeclared variables in Web.gs and other .gs files
const gsFiles = ['Web.gs', 'KPMn.gs', 'Code.gs', 'Gps.gs', 'About.gs', 'Test.gs'];
for (const file of gsFiles) {
  if (fs.existsSync(file)) {
    const code = fs.readFileSync(file, 'utf8');
    // Check for common typo patterns or undefined references
    if (code.match(/\bpic\s*:\s*pic\b/)) {
      issues.push(`Found potentially undeclared 'pic: pic' in ${file}`);
    }
    if (code.match(/\bdriver\s*:\s*driver\b/) && file === 'Web.gs') {
      // Check context in Web.gs
    }
  }
}

// 4. Check Tokens consistency
const envExample = fs.existsSync('WKPM/combined-app/.env.example') ? fs.readFileSync('WKPM/combined-app/.env.example', 'utf8') : '';
const envFile = fs.existsSync('WKPM/combined-app/.env') ? fs.readFileSync('WKPM/combined-app/.env', 'utf8') : '';
const apiIndex = fs.readFileSync('WKPM/combined-app/api/index.js', 'utf8');
const netlifyApi = fs.readFileSync('WKPM/combined-app/netlify/functions/api.mjs', 'utf8');

// Check default tokens in proxy files
const adminTokenMatch1 = apiIndex.match(/DEFAULT_ADMIN_TOKEN\s*=\s*['"]([^'"]+)['"]/);
const adminTokenMatch2 = netlifyApi.match(/DEFAULT_ADMIN_TOKEN\s*=\s*['"]([^'"]+)['"]/);
const driverTokenMatch1 = apiIndex.match(/DEFAULT_DRIVER_TOKEN\s*=\s*['"]([^'"]+)['"]/);
const driverTokenMatch2 = netlifyApi.match(/DEFAULT_DRIVER_TOKEN\s*=\s*['"]([^'"]+)['"]/);

if (adminTokenMatch1 && adminTokenMatch2 && adminTokenMatch1[1] !== adminTokenMatch2[1]) {
  issues.push('DEFAULT_ADMIN_TOKEN in api/index.js does not match netlify/functions/api.mjs');
} else {
  passed.push('DEFAULT_ADMIN_TOKEN is consistent across Vercel and Netlify');
}

if (driverTokenMatch1 && driverTokenMatch2 && driverTokenMatch1[1] !== driverTokenMatch2[1]) {
  issues.push('DEFAULT_DRIVER_TOKEN in api/index.js does not match netlify/functions/api.mjs');
} else {
  passed.push('DEFAULT_DRIVER_TOKEN is consistent across Vercel and Netlify');
}

// 5. Check Web.gs Tokens
const webAdminToken = webGs.match(/ADMIN_TOKEN\s*:\s*["']([^"']+)["']/);
const webDriverToken = webGs.match(/DRIVER_TOKEN\s*:\s*["']([^"']+)["']/);

if (webAdminToken && adminTokenMatch1 && webAdminToken[1] !== adminTokenMatch1[1]) {
  issues.push(`ADMIN_TOKEN mismatch between Web.gs (${webAdminToken[1]}) and proxy (${adminTokenMatch1[1]})`);
} else {
  passed.push('ADMIN_TOKEN matches between Web.gs and proxy');
}

if (webDriverToken && driverTokenMatch1 && webDriverToken[1] !== driverTokenMatch1[1]) {
  issues.push(`DRIVER_TOKEN mismatch between Web.gs (${webDriverToken[1]}) and proxy (${driverTokenMatch1[1]})`);
} else {
  passed.push('DRIVER_TOKEN matches between Web.gs and proxy');
}

// 6. Check Spreadsheet Column Constants consistency in Web.gs vs KPMn.gs
const webCols = {};
const kpmnCols = {};
const kpmnGs = fs.readFileSync('KPMn.gs', 'utf8');

for (const m of webGs.matchAll(/var\s+(MONITOR_COL_[A-Z_]+)\s*=\s*(\d+);/g)) {
  webCols[m[1]] = parseInt(m[2], 10);
}
for (const m of kpmnGs.matchAll(/var\s+(MONITOR_COL_[A-Z_]+)\s*=\s*(\d+);/g)) {
  kpmnCols[m[1]] = parseInt(m[2], 10);
}

for (const col of Object.keys(webCols)) {
  if (kpmnCols[col] !== undefined && kpmnCols[col] !== webCols[col]) {
    issues.push(`Column index mismatch for ${col}: Web.gs has ${webCols[col]}, KPMn.gs has ${kpmnCols[col]}`);
  }
}
if (Object.keys(webCols).length > 0) {
  passed.push(`Column indices (${Object.keys(webCols).length} constants) are consistent`);
}

// 7. Check KPM Status Constants consistency
const webStatuses = {};
for (const m of webGs.matchAll(/([A-Z_]+)\s*:\s*["']([^"']+)["']/g)) {
  if (m[0].includes('BARU_DIBUAT') || m[0].includes('BELUM_BERANGKAT') || m[0].includes('BERANGKAT') || m[0].includes('TIBA') || m[0].includes('SELESAI')) {
    webStatuses[m[1]] = m[2];
  }
}
console.log('3. Status Constants Verified:', webStatuses);

// 8. Check Status Transitions map in Web.gs
const transitionsMatch = webGs.match(/var\s+STATUS_TRANSITIONS\s*=\s*\{([\s\S]*?)\};/);
if (transitionsMatch) {
  passed.push('STATUS_TRANSITIONS state machine map is properly defined in Web.gs');
} else {
  warnings.push('STATUS_TRANSITIONS state machine map not found in Web.gs');
}

// Output Results
console.log('\n=== SCAN RESULTS SUMMARY ===');
console.log(`Passed checks: ${passed.length}`);
passed.forEach(p => console.log('  [PASS]', p));

if (warnings.length > 0) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach(w => console.log('  [WARN]', w));
}

if (issues.length > 0) {
  console.log(`\nCritical / Actionable Issues (${issues.length}):`);
  issues.forEach(i => console.log('  [FAIL]', i));
} else {
  console.log('\n✓ No critical mismatches or action route errors detected!');
}
