#!/bin/sh
set -eu

# Load nvm so npm is available even in shells that skip ~/.profile.
NVM_DIR="${NVM_DIR:-$HOME/.var/app/com.visualstudio.code/config/nvm}"
export NVM_DIR

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm.sh not found at $NVM_DIR/nvm.sh" >&2
  echo "Set NVM_DIR to your nvm install before running this script." >&2
  exit 1
fi

# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"

exec npm run dev
