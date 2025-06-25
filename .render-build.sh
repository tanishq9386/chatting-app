#!/bin/bash

# Exit on error
set -o errexit

# Install dependencies
npm install

# Build your app
npm run build

# (Optional) Add any other build steps here, e.g., database migrations, static file generation, etc.
