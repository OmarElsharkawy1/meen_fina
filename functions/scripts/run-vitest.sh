#!/bin/sh
# firebase emulators:exec prepends a bundled Node shim (~/.cache/firebase/runtime) to PATH;
# the shim cannot run ESM-only tools like vitest. Drop it so the real node is used.
PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -v 'firebase/runtime' | paste -sd: -)
export PATH
exec npx vitest run "$@"
