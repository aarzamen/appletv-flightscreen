#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Generating Xcode Project with XcodeGen..."
cd "${ROOT_DIR}"
xcodegen generate

echo "==> FlightScreenTV.xcodeproj successfully generated!"
