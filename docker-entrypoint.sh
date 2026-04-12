#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/drizzle-kit/bin.cjs migrate 2>&1 || echo "Migration warning: drizzle-kit migrate returned non-zero (may be first run)"

echo "Starting server..."
exec node server.js
