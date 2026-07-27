#!/bin/bash
# WebNook Local Uninstaller Script
set -e

echo "===================================================="
echo "    🗑️  Uninstalling WebNook Social Platform"
echo "===================================================="

read -p "Are you sure you want to uninstall WebNook and delete local node_modules & build artifacts? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Uninstallation cancelled."
    exit 0
fi

read -p "Do you also want to purge all database data and user uploads? (y/N): " purge_data

echo "🧹 Removing node_modules and build files..."
rm -rf node_modules backend/node_modules frontend/node_modules
rm -rf backend/dist frontend/dist

if [[ "$purge_data" == "y" || "$purge_data" == "Y" ]]; then
    echo "🔥 Purging database files and user uploads..."
    rm -rf backend/data backend/uploads
fi

echo "===================================================="
echo " ✅ WebNook uninstalled successfully."
echo "===================================================="
