#!/bin/sh
set -e

echo "Running database migrations..."
NODE_PATH=/prisma-cli/node_modules node /prisma-cli/node_modules/prisma/build/index.js migrate deploy

echo "Starting DataWeaver..."
exec node server.js
