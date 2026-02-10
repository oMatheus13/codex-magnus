#!/bin/sh
set -eu

# Configure nvm to load automatically for interactive bash shells.
NVM_DIR="${NVM_DIR:-$HOME/.var/app/com.visualstudio.code/config/nvm}"
export NVM_DIR

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm.sh not found at: $NVM_DIR/nvm.sh" >&2
  echo "Set NVM_DIR to your nvm path and re-run this script." >&2
  exit 1
fi

BASHRC="$HOME/.bashrc"
SNIPPET_LINE_1="export NVM_DIR=\"$NVM_DIR\""
SNIPPET_LINE_2="[ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\""

if [ -f "$BASHRC" ] && grep -Fq "nvm.sh" "$BASHRC"; then
  echo "nvm already configured in $BASHRC"
else
  {
    printf '\n# Load nvm\n'
    printf '%s\n' "$SNIPPET_LINE_1"
    printf '%s\n' "$SNIPPET_LINE_2"
  } >> "$BASHRC"
  echo "Added nvm load to $BASHRC"
fi

echo "Restart your terminal or run: . \"$BASHRC\""
