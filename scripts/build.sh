#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

if [ ! -d "FlightScreenTV.xcodeproj" ]; then
    echo "==> Project not found. Generating..."
    "${SCRIPT_DIR}/generate-project.sh"
fi

SDK="${1:-appletvsimulator}"
DESTINATION="${2:-generic/platform=tvOS Simulator}"

EXTRA_FLAGS=""
if [ "${SDK}" = "appletvos" ]; then
    EXTRA_FLAGS="-allowProvisioningUpdates -allowProvisioningDeviceRegistration"
fi

echo "==> Building FlightScreenTV for ${SDK} (${DESTINATION})..."
xcodebuild \
    -project FlightScreenTV.xcodeproj \
    -scheme FlightScreenTV \
    -sdk "${SDK}" \
    -destination "${DESTINATION}" \
    ${EXTRA_FLAGS} \
    build
