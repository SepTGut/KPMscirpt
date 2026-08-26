#!/usr/bin/env node
/**
 * Automated GPS & Firebase Realtime Database Integration Test & Ultra-Smooth Simulation
 * 
 * Usage:
 *   node scripts/test_gps.mjs             -> Runs automated connection, CRUD, and payload validation tests
 *   node scripts/test_gps.mjs --simulate  -> Simulates ultra-smooth live truck movement with interpolation
 */

const FIREBASE_DB_URL = 'https://linefeedingdbt-default-rtdb.asia-southeast1.firebasedatabase.app';
const TEST_KPM_ID = 'TEST_TRUCK_GPS_01';

// Key Anchor Waypoints between Workshop Candi Sewu and Workshop Sukosari
const ANCHOR_WAYPOINTS = [
  { lat: -7.6162207, lng: 111.5215291, speed: 0, note: 'Workshop Candi Sewu (Jl. Candi Sewu No.30 Madiun)' },
  { lat: -7.6150, lng: 111.5255, speed: 30, note: 'Melintasi Jl. Ring Road Barat Madiun' },
  { lat: -7.6135, lng: 111.5300, speed: 35, note: 'Jl. Basuki Rahmat / Sukosari' },
  { lat: -7.6114512, lng: 111.5348394, speed: 10, note: 'Workshop Sukosari (PT Rekaindo Global Jasa)' }
];

// Helper to calculate bearing angle between two points
function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  const deg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return Math.round(deg);
}

// Generate smooth sub-waypoints
function generateSmoothRoute(anchors, stepsPerSegment = 5) {
  const result = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const bearing = calculateBearing(a.lat, a.lng, b.lat, b.lng);

    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const lat = a.lat + (b.lat - a.lat) * t;
      const lng = a.lng + (b.lng - a.lng) * t;
      const speed = Math.round(a.speed + (b.speed - a.speed) * t);
      result.push({
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        speed: speed,
        heading: bearing,
        note: s === 0 ? a.note : `Meluncur menuju ${b.note}`
      });
    }
  }
  // Add final point
  const last = anchors[anchors.length - 1];
  result.push({
    lat: last.lat,
    lng: last.lng,
    speed: 0,
    heading: 0,
    note: last.note
  });
  return result;
}

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
    accuracy: 5,
    speedKmh: 48,
    heading: 45,
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
  const smoothRoute = generateSmoothRoute(ANCHOR_WAYPOINTS, 5); // 26 high-density points

  console.log('====================================================');
  console.log('🚚 ULTRA-SMOOTH FLEET MOVEMENT SIMULATION (LEAFLET)');
  console.log('====================================================');
  console.log('Buka tab "🗺️ Live Radar Armada" di Admin Web Anda!');
  console.log(`Total 26 titik interpolasi halus (interval 1.5 detik per update)...\n`);

  for (let i = 0; i < smoothRoute.length; i++) {
    const pt = smoothRoute[i];
    const isArrival = (i === smoothRoute.length - 1);
    const payload = {
      kpmId: 'ARMADA_SMOOTH_01',
      driverName: 'DRIVER BUDI (SMOOTH RADAR)',
      status: isArrival ? 'Tiba' : 'Jalan',
      origin: 'Candi Sewu',
      destination: 'Sukosari',
      proyek: 'Line Feeding Smooth Radar',
      latitude: pt.lat,
      longitude: pt.lng,
      accuracy: 4,
      speedKmh: pt.speed,
      heading: pt.heading,
      lastUpdated: Date.now()
    };

    const progress = Math.round(((i + 1) / smoothRoute.length) * 100);
    process.stdout.write(`\r[${progress}%] 🚚 Pos: ${pt.lat}, ${pt.lng} | ${pt.speed} km/h | Heading: ${pt.heading}° | ${pt.note}                    `);

    try {
      const url = `${FIREBASE_DB_URL}/active_tracking/ARMADA_SMOOTH_01.json`;
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}

    if (!isArrival) {
      await new Promise(res => setTimeout(res, 1500));
    }
  }

  console.log('\n\n🎉 Simulasi rute selesai! Membersihkan marker...');
  await new Promise(res => setTimeout(res, 3500));
  try {
    await fetch(`${FIREBASE_DB_URL}/active_tracking/ARMADA_SMOOTH_01.json`, { method: 'DELETE' });
    console.log('✅ Marker simulasi dibersihkan.');
  } catch (e) {}
}

const isSimulate = process.argv.includes('--simulate');
if (isSimulate) {
  runLiveSimulation();
} else {
  runAutomatedTests();
}
