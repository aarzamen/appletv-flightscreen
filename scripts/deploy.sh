#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "==> Scanning for connected Apple TV devices..."
DEVICE_INFO=$(xcrun devicectl list devices --columns 'Platform,State,Model,Identifier,Name' | grep -i "tvOS" || true)

if [ -z "${DEVICE_INFO}" ]; then
    echo ""
    echo "⚠️  No Apple TV currently paired or connected."
    echo "    Found on local Wi-Fi: 'Tv' at 192.168.1.134"
    echo ""
    echo "To complete pairing with your Apple TV:"
    echo "  1. On your Apple TV, go to: Settings ➔ Remotes and Devices ➔ Remote App and Devices"
    echo "  2. In Xcode on Mac, press ⌘⇧2 (Window ➔ Devices and Simulators)"
    echo "  3. Under 'Discovered' in the left sidebar, click 'Pair' next to your Apple TV"
    echo "  4. Enter the 6-digit PIN shown on your TV screen"
    echo "  5. Re-run this script: ./scripts/deploy.sh"
    exit 1
fi

DEVICE_ID=$(echo "${DEVICE_INFO}" | awk '{print $3}')
DEVICE_NAME=$(echo "${DEVICE_INFO}" | awk '{print $1}')

echo "==> Found Apple TV: ${DEVICE_NAME} (${DEVICE_ID})"
echo "==> Building FlightScreenTV for physical Apple TV..."

xcodebuild \
    -project FlightScreenTV.xcodeproj \
    -scheme FlightScreenTV \
    -sdk appletvos \
    -destination "id=${DEVICE_ID}" \
    -allowProvisioningUpdates \
    build

APP_PATH="${HOME}/Library/Developer/Xcode/DerivedData/FlightScreenTV-"*"/Build/Products/Debug-appletvos/FlightScreenTV.app"
APP_DIR=$(ls -td ${APP_PATH} 2>/dev/null | head -n 1)

if [ ! -d "${APP_DIR}" ]; then
    echo "❌ Error: Built app bundle not found at ${APP_DIR}"
    exit 1
fi

echo "==> Installing FlightScreenTV to Apple TV..."
xcrun devicectl device install app --device "${DEVICE_ID}" "${APP_DIR}"

echo "==> Launching FlightScreenTV on Apple TV..."
xcrun devicectl device process launch --device "${DEVICE_ID}" com.flightscreen.tvos

echo "✅ Successfully deployed and launched FlightScreen TV on your Apple TV!"
