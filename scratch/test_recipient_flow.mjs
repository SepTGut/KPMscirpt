import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING COMPREHENSIVE RECIPIENT & COLUMN AA AUDIT ===\n');

let failedTests = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

// 1. Audit Column AA in gas/KPMn.gs
const kpmnPath = path.join(rootDir, 'gas', 'KPMn.gs');
const kpmnCode = fs.readFileSync(kpmnPath, 'utf8');

assert(kpmnCode.includes('var MONITOR_TOTAL_COLS = 27;'), 'MONITOR_TOTAL_COLS is set to 27 in KPMn.gs');
assert(kpmnCode.includes('var MONITOR_COL_PENERIMA = 27;'), 'MONITOR_COL_PENERIMA is mapped to Column 27 (AA) in KPMn.gs');

// 2. Audit all .gs files for JavaScript syntax validity using Node vm
const gasDir = path.join(rootDir, 'gas');
const gasFiles = fs.readdirSync(gasDir).filter(f => f.endsWith('.gs'));

for (const file of gasFiles) {
  const code = fs.readFileSync(path.join(gasDir, file), 'utf8');
  try {
    // Check JS syntax with Script
    new vm.Script(code, { filename: file });
    assert(true, `Syntax check passed for gas/${file}`);
  } catch (err) {
    assert(false, `Syntax error in gas/${file}: ${err.message}`);
  }
}

// 3. Audit WebConfig.gs
const webConfigPath = path.join(rootDir, 'gas', 'WebConfig.gs');
const webConfigCode = fs.readFileSync(webConfigPath, 'utf8');
assert(webConfigCode.includes('RECIPIENTS_SHEET_NAME: "Penerima"'), 'RECIPIENTS_SHEET_NAME is defined in WebConfig.gs');
assert(webConfigCode.includes('DEFAULT_RECIPIENTS:'), 'DEFAULT_RECIPIENTS array is defined in WebConfig.gs');

// 4. Audit Router.gs
const routerPath = path.join(rootDir, 'gas', 'Router.gs');
const routerCode = fs.readFileSync(routerPath, 'utf8');
assert(routerCode.includes('"stageArrival"'), 'stageArrival is in allowedPostActions');
assert(routerCode.includes('"confirmArrivalReceipt"'), 'confirmArrivalReceipt is in allowedPostActions');
assert(routerCode.includes('"getRecipients"'), 'getRecipients is in allowed actions');

// 5. Audit KpmAction.gs
const kpmActionPath = path.join(rootDir, 'gas', 'KpmAction.gs');
const kpmActionCode = fs.readFileSync(kpmActionPath, 'utf8');
assert(kpmActionCode.includes('function stageArrival('), 'stageArrival function implemented in KpmAction.gs');
assert(kpmActionCode.includes('function confirmArrivalReceipt('), 'confirmArrivalReceipt function implemented in KpmAction.gs');
assert(kpmActionCode.includes('MONITOR_COL_PENERIMA - 1'), 'MONITOR_COL_PENERIMA - 1 is written in validateAndUpdateStatus');
assert(kpmActionCode.includes('penerima: namaPenerima'), 'penerima is passed to appendTLogRecord');

// 6. Audit Gps.gs
const gpsPath = path.join(rootDir, 'gas', 'Gps.gs');
const gpsCode = fs.readFileSync(gpsPath, 'utf8');
assert(gpsCode.includes('"Penerima"'), 'Penerima is in T.Log headers and setupTrackingHeaders');

// 7. Audit Frontend Components
const recipientPanelPath = path.join(rootDir, 'apps', 'web', 'src', 'components', 'RecipientConfirmPanel.vue');
assert(fs.existsSync(recipientPanelPath), 'RecipientConfirmPanel.vue exists');
const recipientPanelCode = fs.readFileSync(recipientPanelPath, 'utf8');
assert(recipientPanelCode.includes('confirmArrivalReceipt'), 'RecipientConfirmPanel calls confirmArrivalReceipt');
assert(recipientPanelCode.includes('getRecipients'), 'RecipientConfirmPanel calls getRecipients');

const driverPanelPath = path.join(rootDir, 'apps', 'web', 'src', 'components', 'DriverDeliveryPanel.vue');
const driverPanelCode = fs.readFileSync(driverPanelPath, 'utf8');
assert(driverPanelCode.includes('handleStageArrivalQr'), 'DriverDeliveryPanel implements handleStageArrivalQr');
assert(driverPanelCode.includes('showQrModal'), 'DriverDeliveryPanel includes showQrModal');
assert(driverPanelCode.includes('startPollingConfirmation'), 'DriverDeliveryPanel includes auto-polling confirmation');

const appVuePath = path.join(rootDir, 'apps', 'web', 'src', 'App.vue');
const appVueCode = fs.readFileSync(appVuePath, 'utf8');
assert(appVueCode.includes('RecipientConfirmPanel'), 'App.vue imports RecipientConfirmPanel');
assert(appVueCode.includes('isRecipientConfirm'), 'App.vue handles isRecipientConfirm state');
assert(appVueCode.includes("'/kpm/confirm'"), 'App.vue registers /kpm/confirm route');

console.log(`\n=== AUDIT FINISHED: ${failedTests} failed test(s) ===`);
process.exit(failedTests > 0 ? 1 : 0);
