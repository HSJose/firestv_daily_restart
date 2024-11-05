import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// import environment variables
dotenv.config();

// get the api key from the environment variables
const API_KEY = process.env.API_KEY

// list of URLs
const LOCK_DEVICE_URL = 'https://api-dev.headspin.io/v0/devices/lock'
const RESTART_DEVICE_URL = (device_id) => `https://api-dev.headspin.io/v0/adb/${device_id}/reboot`

// list of devices that could not be restarted
const devices_list = [
    'G4N1EL0820360AAH@dev-us-sny-9-proxy-22-lin.headspin.io',
    'G070VM2420620JBT@dev-ca-tor-2-proxy-10-lin.headspin.io',
    'G070VM24203202X0@dev-ca-tor-2-proxy-7-lin.headspin.io',
    'G0723H07242506U0@dev-us-pao-5-proxy-6-lin.headspin.io',
    'G070VM2420340AEE@dev-ca-tor-2-proxy-3-lin.headspin.io',
    'G070VM20114307PB@dev-us-pao-3-proxy-27-lin.headspin.io',
    'G070L80972242W0R@dev-us-sny-9-proxy-10-lin.headspin.io',
    'G070VM2420340EH4@dev-ca-tor-2-proxy-3-lin.headspin.io',
    'G070VM24203204D9@dev-ca-tor-2-proxy-10-lin.headspin.io',
    'G070VM2420320JC3@dev-ca-tor-2-proxy-7-lin.headspin.io',
    'G0911X030284015V@dev-us-pao-5-proxy-6-lin.headspin.io',
    'G070VM1804550H59@dev-us-sny-9-proxy-12-lin.headspin.io',
    'G070VM2414630NBX@dev-us-pao-5-proxy-12-lin.headspin.io',
    'G070VM20114306AU@dev-us-pao-3-proxy-28-lin.headspin.io',
    'G070L815743217K5@dev-us-sny-9-proxy-22-lin.headspin.io',
    'G6G11X032172074X@dev-us-pao-5-proxy-6-lin.headspin.io',
    'G070VM2420250UXS@dev-ca-tor-2-proxy-7-lin.headspin.io',
    'G070VM2420432LXM@dev-ca-tor-2-proxy-10-lin.headspin.io',
    '70941609451316D4@dev-us-sny-9-proxy-10-lin.headspin.io',
    'G070VM24202602CQ@dev-ca-tor-2-proxy-10-lin.headspin.io',
    'G070VM20118618AA@dev-us-sny-9-proxy-23-lin.headspin.io',
    'G070VM16020218DR@dev-us-pao-3-proxy-27-lin.headspin.io',
    'G070VM20114307Q7@dev-us-pao-3-proxy-28-lin.headspin.io',
    'G070VM2420260178@dev-ca-tor-2-proxy-3-lin.headspin.io',
    'G070VM14941305AV@dev-us-pao-5-proxy-12-lin.headspin.io',
    'G070VM1601950HE9@dev-us-pao-3-proxy-20-lin.headspin.io',
    'G070VM2420340B0S@dev-ca-tor-2-proxy-7-lin.headspin.io',
    'G071R20720750UL5@dev-us-sny-5-proxy-27-lin.headspin.io',
    'G070VM2420620SWG@dev-ca-tor-2-proxy-10-lin.headspin.io',
    'G070VM24202602AV@dev-ca-tor-2-proxy-7-lin.headspin.io',
    'G070VM2420340GWS@dev-ca-tor-2-proxy-3-lin.headspin.io',
    'G070VM2420340F7U@dev-ca-tor-2-proxy-7-lin.headspin.io',
    'G070VM24203208EN@dev-ca-tor-2-proxy-10-lin.headspin.io',
]

// Function to log messages to a file
function log_message(message) {
    const logFilePath = path.join(__dirname, 'device_process_log.txt');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
}

// Function to log the start of a run
function log_run_start() {
    log_message('--- Run Start ---');
}

// Function to log the end of a run
function log_run_end() {
    log_message('--- Run End ---');
}

// Function to lock a device
async function lock_device(device_id) {
    const response = await fetch(LOCK_DEVICE_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            "device_id": device_id
        })
    });
    return response.ok;
}

// Function to restart a device
async function restart_device(device_id) {
    const response = await fetch(RESTART_DEVICE_URL(device_id), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    return response.ok;
}

// Function to process each device with retry logic
async function process_device_with_retry(deviceAddress, retryCount = 0) {
    const [device_id] = deviceAddress.split('@');

    try {
        const isLocked = await lock_device(device_id);
        if (isLocked) {
            const isRestarted = await restart_device(device_id);
            if (isRestarted) {
                log_message(`Successfully locked and restarted device: ${device_id}`);
            } else {
                throw new Error(`Failed to restart device: ${device_id}`);
            }
        } else {
            throw new Error(`Failed to lock device: ${device_id}`);
        }
    } catch (error) {
        console.error(`Error processing device ${device_id} on attempt ${retryCount + 1}:`, error);
        if (retryCount < 2) { // Retry up to 3 times (0, 1, 2)
            await process_device_with_retry(deviceAddress, retryCount + 1);
        } else {
            throw new Error(`Failed to process device ${device_id} after 3 attempts`);
        }
    }
}

// Function to save the failed devices list to a file
function save_failed_devices_to_file(failedDevices) {
    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const formattedTime = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `${formattedDate}-${formattedTime}-Failed_to_restart.txt`;
    const filePath = path.join(__dirname, filename);

    const fileContent = failedDevices.join('\n');
    fs.writeFileSync(filePath, fileContent, 'utf8');

    console.log(`Failed devices have been saved to ${filename}`);
    log_message(`Failed devices have been saved to ${filename}`);
}

// Main function to handle all devices with retry limit
async function handle_devices(devices = devices_list, retryLimit = 3, currentRetry = 0) {
    log_run_start();

    const couldNotRestart = [];

    // Create an array of promises to process devices concurrently
    const promises = devices.map(async (deviceAddress) => {
        try {
            await process_device_with_retry(deviceAddress);
        } catch (error) {
            couldNotRestart.push(deviceAddress);
        }
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    // Log devices that could not be restarted
    if (couldNotRestart.length > 0) {
        console.log("The following devices could not be restarted after 3 attempts:", couldNotRestart);
        save_failed_devices_to_file(couldNotRestart);
    }

    log_run_end();

    // Check if retry limit has been reached
    if (couldNotRestart.length > 0 && currentRetry < retryLimit) {
        setTimeout(() => handle_devices(couldNotRestart, retryLimit, currentRetry + 1), 5 * 60 * 1000);
    } else if (couldNotRestart.length > 0 && currentRetry >= retryLimit) {
        console.log("Maximum retries reached. No more retries will be attempted.");
        log_message("Maximum retries reached. No more retries will be attempted.");
    }
}

// Start the process
handle_devices();
