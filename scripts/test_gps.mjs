#!/usr/bin/env node
/**
 * Automated GPS & Firebase Realtime Database Integration Test
 * 
 * Usage:
 *   node scripts/test_gps.mjs             -> Runs automated connection, CRUD, and payload validation tests
 *   node scripts/test_gps.mjs --simulate  -> Simulates live truck movement for visual Leaflet testing
 */

const FIREBASE_DB_URL = 'https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app';
const TEST_KPM_ID = 'TEST_TRUCK_GPS_01';

// Waypoints between Workshop Candi Sewu and Workshop Sukosari
const WAYPOINTS = [
  { lat: -7.7495, lng: 110.4932, speed: 0, note: 'Berangkat dari Workshop Candi Sewu' },
  { lat: -7.7210, lng: 110.5340, speed: 42, note: 'Melintasi Jl. Raya Jogja-Solo' },
  { lat: -7.6850, lng: 110.6010, speed: 55, note: 'Jalan Lingkar Klaten' },
  { lat: -7.6320, lng: 110.6980, speed: 48, note: 'Menuju Boyolali / Solo' },
  { lat: -7.5890, lng: 110.7650, speed: 38, note: 'Memasuki kawasan Kartasura' },
  { lat: -7.5621, lng: 110.8245, speed: 15, note: 'Mendekati Workshop Sukosari (Tiba)' }
];

async function runAutomatedTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTOMATED GPS & FIREBASE INTEGRATION TEST');
  console.log('====================================================');
  console.log(`Target Database: ${FIREBASE_DB_URL}`);
  console.log(`Test KPM Key:    ${TEST_KPM_ID}\n`);

  let passed = 0;
  let failed = 0;

  // 1. Connection & Write Test (PUT /active_tracking/{key}.json)
  console.log('1️⃣ Testing PUT live coordinates to Firebase...');
  const initialPayload = {
    kpmId: TEST_KPM_ID,
    driverName: 'PAK BUDI (TEST DRIVER)',
    status: 'Jalan',
    origin: 'Candi Sewu',
    destination: 'Sukosari',
    proyek: 'Line Feeding Unit Testing',
    latitude: -7.7495,
    longitude: 110.4932,
    accuracy: 6,
    speedKmh: 45,
    heading: 42,
    lastUpdated: Date.now()
  };

  try {
    const putUrl = `${FIREBASE_DB_URL}/active_tracking/${TEST_KPM_ID}.json`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialPayload)
    });

    if (putRes.ok) {
      console.log('   ✅ PASS: Coordinate written successfully (HTTP ' + putRes.status + ')');
      passed++;
    } else {
      console.error('   ❌ FAIL: Server responded with HTTP ' + putRes.status);
      failed++;
    }
  } catch (err) {
    console.error('   ❌ FAIL: Network / Connection error:', err.message);
    failed++;
  }

  // 2. Read Test (GET /active_tracking.json)
  console.log('\n2️⃣ Testing GET active tracking list for Leaflet Map...');
  try {
    const getUrl = `${FIREBASE_DB_URL}/active_tracking.json`;
    const getRes = await fetch(getUrl);
    const data = await getRes.json();

    if (getRes.ok && data && data[TEST_KPM_ID]) {
      const item = data[TEST_KPM_ID];
      console.log('   ✅ PASS: Successfully retrieved active tracking node:');
      console.log(`      • Driver:      ${item.driverName}`);
      console.log(`      • Coordinates: ${item.latitude}, ${item.longitude} (Speed: ${item.speedKmh} km/h)`);
      console.log(`      • Route:       ${item.origin} ➔ ${item.destination}`);
      passed++;
    } else {
      console.error('   ❌ FAIL: Test node not found in active_tracking response');
      failed++;
    }
  } catch (err) {
    console.error('   ❌ FAIL: Read error:', err.message);
    failed++;
  }

  // 3. Router URL Generation Verification
  console.log('\n3️⃣ Testing Google Maps Router link construction...');
  const originCoord = `${initialPayload.latitude},${initialPayload.longitude}`;
  const destCoord = '-7.5621,110.8245';
  const routerUrl = `https://www.google.com/maps/dir/?api=1&origin=${originCoord}&destination=${destCoord}&travelmode=driving`;
  console.log(`   Generated Router: ${routerUrl}`);
  if (routerUrl.includes('travelmode=driving') && routerUrl.includes(originCoord)) {
    console.log('   ✅ PASS: Google Maps Router format is valid');
    passed++;
  } else {
    console.error('   ❌ FAIL: Invalid router URL format');
    failed++;
  }

  // 4. Cleanup Test (DELETE /active_tracking/{key}.json)
  console.log('\n4️⃣ Testing DELETE on arrival (Node Cleanup)...');
  try {
    const delUrl = `${FIREBASE_DB_URL}/active_tracking/${TEST_KPM_ID}.json`;
    const delRes = await fetch(delUrl, { method: 'DELETE' });

    // Verify deletion
    const verifyRes = await fetch(`${FIREBASE_DB_URL}/active_tracking/${TEST_KPM_ID}.json`);
    const verifyData = await verifyRes.json();

    if (delRes.ok && verifyData === null) {
      console.log('   ✅ PASS: Test node cleared cleanly from Firebase.');
      passed++;
    } else {
      console.error('   ❌ FAIL: Node was not deleted completely.');
      failed++;
    }
  } catch (err) {
    console.error('   ❌ FAIL: Cleanup error:', err.message);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

async function runLiveSimulation() {
  console.log('====================================================');
  console.log('🚚 SIMULATING LIVE TRUCK MOVEMENT FOR LEAFLET RADAR');
  console.log('====================================================');
  console.log('Buka tab "🗺️ Live Radar Armada" di Admin Web Anda sekarang!');
  console.log('Truk simulasi akan bergerak dari Candi Sewu ➔ Sukosari...\n');

  for (let i = 0; i < WAYPOINTS.length; i++) {
    const wp = WAYPOINTS[i];
    const payload = {
      kpmId: 'SIMULASI_TRUK_01',
      driverName: 'DRIVER SIMULASI',
      status: i === WAYPOINTS.length - 1 ? 'Tiba' : 'Jalan',
      origin: 'Candi Sewu',
      destination: 'Sukosari',
      proyek: 'Line Feeding Demo GPS',
      latitude: wp.lat,
      longitude: wp.lng,
      accuracy: 5,
      speedKmh: wp.speed,
      heading: 35,
      lastUpdated: Date.now()
    };

    console.log(`[Titik ${i + 1}/${WAYPOINTS.length}] Lat: ${wp.lat}, Lng: ${wp.lng} | Kecepatan: ${wp.speed} km/h | ${wp.note}`);

    try {
      const url = `${FIREBASE_DB_URL}/active_tracking/SIMULASI_TRUK_01.json`;
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Gagal mengirim koordinat:', e.message);
    }

    if (i < WAYPOINTS.length - 1) {
      console.log('   Menunggu 4 detik untuk update posisi berikutnya...\n');
      await new Promise(res => setTimeout(res, 4000));
    }
  }

  console.log('\n🎉 Simulasi selesai! Membersihkan marker simulasi...');
  await new Promise(res => setTimeout(res, 3000));
  try {
    await fetch(`${FIREBASE_DB_URL}/active_tracking/SIMULASI_TRUK_01.json`, { method: 'DELETE' });
    console.log('✅ Marker simulasi dibersihkan.');
  } catch (e) {}
}

const isSimulate = process.argv.includes('--simulate');
if (isSimulate) {
  runLiveSimulation();
} else {
  runAutomatedTests();
}
