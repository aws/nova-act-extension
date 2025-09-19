#!/usr/bin/env bash
set -euo pipefail

echo "🔨 Building Nova Act Extension..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm run test:unit

# Build the extension
echo "📦 Building extension..."
npm run prepublishonly


echo "✅ Build completed successfully!"
echo "📁 Extension package created: amazon-nova-act-extension-*.vsix"