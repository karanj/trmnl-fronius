#!/usr/bin/env python3
"""
Fronius Solar to TRMNL Webhook Script

This script fetches data from your local Fronius inverter and pushes it to TRMNL
via webhook. Run this on a schedule (cron job, systemd timer, etc.) on a machine
that has access to your local network.

Setup:
1. pip install requests
2. Set your TRMNL webhook URL and inverter IP in the config below
3. Schedule this script to run every 5-15 minutes
"""

import requests
import json
import sys
from datetime import datetime

# =============================================================================
# CONFIGURATION - Update these values
# =============================================================================
TRMNL_WEBHOOK_URL = "YOUR_TRMNL_WEBHOOK_URL_HERE"  # Get this from TRMNL plugin settings
FRONIUS_INVERTER_IP = "192.168.1.XXX"  # Your inverter's local IP address
# =============================================================================

def fetch_fronius_data():
    """Fetch real-time data from Fronius inverter."""
    url = f"http://{FRONIUS_INVERTER_IP}/solar_api/v1/GetPowerFlowRealtimeData.fcgi"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from Fronius inverter: {e}", file=sys.stderr)
        return None

def extract_solar_data(fronius_response):
    """Extract relevant solar data from Fronius API response."""
    try:
        site_data = fronius_response.get("Body", {}).get("Data", {}).get("Site", {})

        # Extract values with defaults
        current_power_w = site_data.get("P_PV", 0) or 0  # Current production in Watts
        daily_energy_wh = site_data.get("E_Day", 0) or 0  # Daily total in Watt-hours
        
        # Convert to more readable units
        current_power_kw = round(current_power_w / 1000, 2)
        daily_energy_kwh = round(daily_energy_wh / 1000, 2)

        return {
            "current_power": current_power_kw,
            "daily_total": daily_energy_kwh,
            "timestamp": datetime.now().isoformat(),
            "status": "online"
        }
    except (KeyError, TypeError) as e:
        print(f"Error parsing Fronius data: {e}", file=sys.stderr)
        return None

def send_to_trmnl(data):
    """Send data to TRMNL via webhook."""
    try:
        # TRMNL webhook payload (max 2kb)
        payload = {
            "merge_variables": data
        }

        response = requests.post(
            TRMNL_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()

        print(f"Successfully sent data to TRMNL: {json.dumps(data, indent=2)}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error sending data to TRMNL: {e}", file=sys.stderr)
        return False

def main():
    """Main execution function."""
    print(f"[{datetime.now().isoformat()}] Starting Fronius Solar data fetch...")

    # Validate configuration
    if TRMNL_WEBHOOK_URL == "YOUR_TRMNL_WEBHOOK_URL_HERE":
        print("Error: Please configure TRMNL_WEBHOOK_URL in the script", file=sys.stderr)
        sys.exit(1)

    if "XXX" in FRONIUS_INVERTER_IP:
        print("Error: Please configure FRONIUS_INVERTER_IP in the script", file=sys.stderr)
        sys.exit(1)

    # Fetch data from Fronius
    fronius_data = fetch_fronius_data()
    if not fronius_data:
        sys.exit(1)

    # Extract relevant solar metrics
    solar_data = extract_solar_data(fronius_data)
    if not solar_data:
        sys.exit(1)

    # Send to TRMNL
    success = send_to_trmnl(solar_data)

    if success:
        print("Done!")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
