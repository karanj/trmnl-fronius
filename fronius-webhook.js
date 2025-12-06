#!/usr/bin/env node
/**
 * Fronius Solar to TRMNL Webhook Script (Node.js)
 *
 * This script fetches data from your local Fronius inverter and pushes it to TRMNL
 * via webhook. Run this on a schedule (cron job, systemd timer, etc.) on a machine
 * that has access to your local network.
 *
 * Setup:
 * 1. npm install node-fetch (or use built-in fetch if Node 18+)
 * 2. Set your TRMNL webhook URL and inverter IP in the config below
 * 3. Schedule this script to run every 5-15 minutes
 */

// =============================================================================
// CONFIGURATION - Update these values
// =============================================================================
const TRMNL_WEBHOOK_URL = "YOUR_TRMNL_WEBHOOK_URL_HERE"; // Get this from TRMNL plugin settings
const FRONIUS_INVERTER_IP = "192.168.1.XXX"; // Your inverter's local IP address
// =============================================================================

/**
 * Fetch real-time data from Fronius inverter
 */
async function fetchFroniusData() {
  const url = `http://${FRONIUS_INVERTER_IP}/solar_api/v1/GetPowerFlowRealtimeData.fcgi`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from Fronius inverter: ${error.message}`);
    return null;
  }
}

/**
 * Extract relevant solar data from Fronius API response
 */
function extractSolarData(froniusResponse) {
  try {
    const siteData = froniusResponse?.Body?.Data?.Site || {};

    // Extract values with defaults
    const currentPowerW = siteData.P_PV || 0; // Current production in Watts
    const dailyEnergyWh = siteData.E_Day || 0; // Daily total in Watt-hours
    const gridPowerW = siteData.P_Grid || 0; // Grid flow in Watts (negative = export)

    // Convert to more readable units
    const currentPowerKw = Math.round((currentPowerW / 1000) * 100) / 100;
    const dailyEnergyKwh = Math.round((dailyEnergyWh / 1000) * 100) / 100;
    const gridPowerKw = Math.round((gridPowerW / 1000) * 100) / 100;

    return {
      current_power: currentPowerKw,
      daily_total: dailyEnergyKwh,
      grid_power: gridPowerKw,
      timestamp: new Date().toISOString(),
      status: "online"
    };
  } catch (error) {
    console.error(`Error parsing Fronius data: ${error.message}`);
    return null;
  }
}

/**
 * Send data to TRMNL via webhook
 */
async function sendToTRMNL(data) {
  try {
    // TRMNL webhook payload (max 2kb)
    const payload = {
      merge_variables: data
    };

    const response = await fetch(TRMNL_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`Successfully sent data to TRMNL:`, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error sending data to TRMNL: ${error.message}`);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log(`[${new Date().toISOString()}] Starting Fronius Solar data fetch...`);

  // Validate configuration
  if (TRMNL_WEBHOOK_URL === "YOUR_TRMNL_WEBHOOK_URL_HERE") {
    console.error("Error: Please configure TRMNL_WEBHOOK_URL in the script");
    process.exit(1);
  }

  if (FRONIUS_INVERTER_IP.includes("XXX")) {
    console.error("Error: Please configure FRONIUS_INVERTER_IP in the script");
    process.exit(1);
  }

  // Fetch data from Fronius
  const froniusData = await fetchFroniusData();
  if (!froniusData) {
    process.exit(1);
  }

  // Extract relevant solar metrics
  const solarData = extractSolarData(froniusData);
  if (!solarData) {
    process.exit(1);
  }

  // Send to TRMNL
  const success = await sendToTRMNL(solarData);

  if (success) {
    console.log("Done!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
