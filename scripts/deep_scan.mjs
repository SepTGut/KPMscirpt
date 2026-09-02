import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== STARTING DEEP SCAN FOR KPM SCRIPT PROJECT ===\n');

const issues = [];
const warnings = [];
const passed = [];

// 1. Check all frontend files for API actions
const frontendFiles = [
  path.join(rootDir, 'apps/web/src/App.vue'),
  path.join(rootDir, 'apps/web/src/composables/useApi.js'),
  path.join(rootDir, 'apps/web/src/composables/useAuth.js'),
  path.join(rootDir, 'apps/web/src/composables/useKpm.js'),
  path.join(rootDir, 'apps/web/src/composables/useGps.js'),
  path.join(rootDir, 'apps/web/src/components/AdminCreatePanel.vue'),
  path.join(rootDir, 'apps/web/src/components/AdminMonitoringPanel.vue'),
  path.join(rootDir, 'apps/web/src/components/DriverDeliveryPanel.vue'),
  path.join(rootDir, 'apps/web/src/components/MaterialEditorModal.vue'),
  path.join(rootDir, 'apps/web/src/components/LiveTrackingMap.vue'),
  path.join(rootDir, 'apps/web/src/services/trackingService.js'),
  path.join(rootDir, 'apps/mobile/src/services/api.js')
];

const frontEndActions = new Set();
for (const file of frontendFiles) {
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    const matches1 = text.matchAll(/\baction\s*:\s*['"]([a-zA-Z0-9_-]+)['"]/g);
    for (const m of matches1) frontEndActions.add(m[1]);
    const matches2 = text.matchAll(/api\(\s*['"]([a-zA-Z0-9_-]+)['"]/g);
    for (const m of matches2) frontEndActions.add(m[1]);
    const matches3 = text.matchAll(/apiCall\(\s*['"]([a-zA-Z0-9_-]+)['"]/g);
    for (const m of matches3) frontEndActions.add(m[1]);
  }
}

console.log('1. Frontend Actions Discovered:', Array.from(frontEndActions));

// 2. Check GAS action handlers in gas/Router.gs, gas/KpmAction.gs, gas/KpmMonitor.gs, gas/Auth.gs
const gasDir = path.join(rootDir, 'gas');
let allGasCode = '';
if (fs.existsSync(gasDir)) {
  const gasFiles = fs.readdirSync(gasDir).filter(f => f.endsWith('.gs'));
  for (const file of gasFiles) {
    allGasCode += fs.readFileSync(path.join(gasDir, file), 'utf8') + '\n';
  }
}

const backendHandledActions = new Set();
const actionMatches = allGasCode.matchAll(/action\s*===\s*["']([a-zA-Z0-9_-]+)["']/g);
for (const m of actionMatches) {
  backendHandledActions.add(m[1]);
}
const switchMatches = allGasCode.matchAll(/case\s+["']([a-zA-Z0-9_-]+)["']\s*:/g);
for (const m of switchMatches) {
  backendHandledActions.add(m[1]);
}

console.log('2. Backend Handled Actions in gas/*.gs:', Array.from(backendHandledActions));

for (const act of frontEndActions) {
  if (!backendHandledActions.has(act)) {
    issues.push(`Frontend calls action '${act}' but it is NOT handled in gas/*.gs switch cases!`);
  } else {
    passed.push(`Action '${act}' is registered and handled in gas backend`);
  }
}

// 3. Check for Tokens consistency
const apiIndexFile = path.join(rootDir, 'apps/web/api/index.js');
const serverMjsFile = path.join(rootDir, 'apps/web/server.mjs');
const authGsFile = path.join(rootDir, 'gas/Auth.gs');

if (fs.existsSync(apiIndexFile) && fs.existsSync(serverMjsFile)) {
  const apiIndex = fs.readFileSync(apiIndexFile, 'utf8');
  const serverMjs = fs.readFileSync(serverMjsFile, 'utf8');

  const adminToken1 = (apiIndex.match(/DEFAULT_ADMIN_TOKEN\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  const adminToken2 = (serverMjs.match(/DEFAULT_ADMIN_TOKEN\s*=\s*['"]([^'"]+)['"]/) || [])[1];

  if (adminToken1 && adminToken2 && adminToken1 === adminToken2) {
    passed.push(`DEFAULT_ADMIN_TOKEN is consistent across Vercel API and Docker Server (${adminToken1.slice(0, 8)}...)`);
  } else {
    issues.push('DEFAULT_ADMIN_TOKEN mismatch between Vercel API and Docker server.mjs');
  }

  const driverToken1 = (apiIndex.match(/DEFAULT_DRIVER_TOKEN\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  const driverToken2 = (serverMjs.match(/DEFAULT_DRIVER_TOKEN\s*=\s*['"]([^'"]+)['"]/) || [])[1];

  if (driverToken1 && driverToken2 && driverToken1 === driverToken2) {
    passed.push(`DEFAULT_DRIVER_TOKEN is consistent across Vercel API and Docker Server (${driverToken1.slice(0, 8)}...)`);
  } else {
    issues.push('DEFAULT_DRIVER_TOKEN mismatch between Vercel API and Docker server.mjs');
  }
}

// 4. Check Spreadsheet Column Constants consistency in WebConfig.gs vs KPMn.gs
const webConfigGsFile = path.join(rootDir, 'gas/WebConfig.gs');
const kpmnGsFile = path.join(rootDir, 'gas/KPMn.gs');

if (fs.existsSync(webConfigGsFile) && fs.existsSync(kpmnGsFile)) {
  const webConfigGs = fs.readFileSync(webConfigGsFile, 'utf8');
  const kpmnGs = fs.readFileSync(kpmnGsFile, 'utf8');

  const webCols = {};
  const kpmnCols = {};

  for (const m of webConfigGs.matchAll(/var\s+(MONITOR_COL_[A-Z_]+)\s*=\s*(\d+);/g)) {
    webCols[m[1]] = parseInt(m[2], 10);
  }
  for (const m of kpmnGs.matchAll(/var\s+(MONITOR_COL_[A-Z_]+)\s*=\s*(\d+);/g)) {
    kpmnCols[m[1]] = parseInt(m[2], 10);
  }

  let colMismatch = false;
  for (const col of Object.keys(webCols)) {
    if (kpmnCols[col] !== undefined && kpmnCols[col] !== webCols[col]) {
      issues.push(`Column index mismatch for ${col}: WebConfig.gs has ${webCols[col]}, KPMn.gs has ${kpmnCols[col]}`);
      colMismatch = true;
    }
  }
  if (!colMismatch && Object.keys(webCols).length > 0) {
    passed.push(`Column indices (${Object.keys(webCols).length} constants) are consistent between WebConfig.gs and KPMn.gs`);
  }
}

// 5. Check KPM Status Constants & State Machine in gas/WebConfig.gs
if (fs.existsSync(webConfigGsFile)) {
  const webConfigGs = fs.readFileSync(webConfigGsFile, 'utf8');
  const transitionsMatch = webConfigGs.match(/var\s+STATUS_TRANSITIONS\s*=\s*(?:Object\.freeze\()?\s*\{([\s\S]*?)\}/);
  if (transitionsMatch) {
    passed.push('STATUS_TRANSITIONS state machine map is properly defined in gas/WebConfig.gs');
  } else {
    warnings.push('STATUS_TRANSITIONS state machine map not found in gas/WebConfig.gs');
  }
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
  console.log('\n✓ No critical mismatches or action route errors detected! All components are 100% synchronized.');
}
