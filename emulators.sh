#!/usr/bin/env bash
# Start Firebase emulators with data persistence.
# Data is saved to ./emulator-data on exit and restored on next run.

set -euo pipefail

EXPORT_DIR="emulator-data"

firebase emulators:start \
  --only auth,firestore,functions,storage \
  --import "$EXPORT_DIR" \
  --export-on-exit "$EXPORT_DIR"
