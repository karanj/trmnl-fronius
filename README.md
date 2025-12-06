# Fronius Solar TRMNL Plugin

A TRMNL plugin for displaying real-time Fronius Solar inverter data on your e-ink dashboard.

## Features

- Current solar production (kW)
- Total energy produced today (kWh)
- Grid import/export status (optional)
- Real-time updates from your Fronius inverter

## Setup Method: Webhook Push (Recommended)

This method is ideal when your inverter is on your local network and not publicly accessible. You'll run a script on a local machine (like a Raspberry Pi, NAS, or always-on computer) that fetches data from your inverter and pushes it to TRMNL.

### Prerequisites

- TRMNL device with Developer add-on
- Fronius solar inverter on your local network
- A machine on your local network to run the script (Raspberry Pi, NAS, home server, etc.)
- Python 3 or Node.js installed on that machine

### Installation Steps

1. **Create the Private Plugin in TRMNL:**
   - Go to https://usetrmnl.com/plugins/my/new
   - Create a new Private Plugin
   - Choose **"Webhook"** strategy
   - Copy your webhook URL (you'll need this in step 3)

2. **Add the Template:**
   - Copy the contents of `template-webhook.html` into your Private Plugin's template editor

3. **Configure the Script:**

   **For Python (fronius-webhook.py):**
   ```bash
   # Install dependencies
   pip install requests

   # Edit the script and set your values:
   # - TRMNL_WEBHOOK_URL (from step 1)
   # - FRONIUS_INVERTER_IP (your inverter's local IP)
   nano fronius-webhook.py

   # Test it
   python3 fronius-webhook.py
   ```

   **For Node.js (fronius-webhook.js):**
   ```bash
   # No dependencies needed for Node 18+
   # For older Node versions: npm install node-fetch

   # Edit the script and set your values:
   # - TRMNL_WEBHOOK_URL (from step 1)
   # - FRONIUS_INVERTER_IP (your inverter's local IP)
   nano fronius-webhook.js

   # Make it executable
   chmod +x fronius-webhook.js

   # Test it
   ./fronius-webhook.js
   ```

4. **Schedule the Script:**

   **Using cron (Linux/Mac):**
   ```bash
   # Edit your crontab
   crontab -e

   # Add one of these lines to run every 10 minutes:
   */10 * * * * /usr/bin/python3 /path/to/fronius-webhook.py >> /var/log/fronius-trmnl.log 2>&1
   # OR
   */10 * * * * /usr/bin/node /path/to/fronius-webhook.js >> /var/log/fronius-trmnl.log 2>&1
   ```

   **Using systemd timer (Linux):**
   See `systemd-example/` directory for service and timer files.

   **Using Task Scheduler (Windows):**
   Create a task that runs `python fronius-webhook.py` every 10 minutes.

### Finding Your Inverter IP

You can find your Fronius inverter's IP address by:
1. Checking your router's connected devices list (look for "Fronius")
2. Using the Fronius Solar.web app settings
3. Accessing your inverter's display menu (if available)
4. Using a network scanner app on your phone/computer

## Files

- `template-webhook.html` - The TRMNL display template for webhook strategy
- `fronius-webhook.py` - Python script to fetch and push data to TRMNL
- `fronius-webhook.js` - Node.js script to fetch and push data to TRMNL
- `README.md` - This file
- `example-response.json` - Example API response from Fronius inverter
- `example-cron.sh` - Example cron job wrapper script

## API Endpoints Used

The plugin uses the Fronius Solar API V1:
- **GetPowerFlowRealtimeData.fcgi** - Provides real-time power flow data including:
  - `P_PV` - Current solar production (W)
  - `E_Day` - Total energy produced today (Wh)

## Customization

You can customize the template to show additional data available from the API:
- Grid consumption
- Battery status (if you have a battery system)
- Self-consumption rate
- And more

## Troubleshooting

- **No data showing**:
  - Check the script logs to see if it's running successfully
  - Verify your inverter IP address is correct and accessible from your network
  - Ensure the TRMNL webhook URL is correct

- **Zero values at night**: This is normal - the inverter reports 0 when not producing

- **Connection errors**:
  - Ensure your inverter's API is enabled (check Fronius settings)
  - Test the inverter URL directly in a browser: `http://YOUR_IP/solar_api/v1/GetPowerFlowRealtimeData.fcgi`

- **Script not running automatically**:
  - Check cron logs: `grep CRON /var/log/syslog`
  - Verify cron service is running: `systemctl status cron`
  - Make sure script paths are absolute in crontab

- **Data not updating**:
  - Verify the webhook URL in TRMNL hasn't changed
  - Check that your scheduled task is still running
  - Look at script logs for error messages

## Resources

- [Fronius Solar API Documentation](https://www.fronius.com/en/solar-energy/installers-partners/products/all-products/system-monitoring/open-interfaces/fronius-solar-api-json-)
- [TRMNL Private Plugins Guide](https://help.usetrmnl.com/en/articles/9510536-private-plugins)
- [TRMNL Template Documentation](https://docs.usetrmnl.com/go/private-plugins/templates)
