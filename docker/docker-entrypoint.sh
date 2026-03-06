#!/bin/bash
set -e

CONFIG_PATH="/paperclip/instances/default/config.json"

# 1. Automatic Onboarding (First Run)
if [ ! -f "$CONFIG_PATH" ]; then
    echo "Creating initial Paperclip configuration..."
    pnpm paperclipai onboard --yes
    
    # Ensure deploymentMode is set to authenticated if we want to bootstrap CEO
    # The default 'onboard --yes' might set it to local_trusted
    sed -i 's/"deploymentMode": "local_trusted"/"deploymentMode": "authenticated"/' "$CONFIG_PATH"
    
    echo "Onboarding complete."
    AUTO_BOOTSTRAP=true
else
    AUTO_BOOTSTRAP=false
fi

# 2. Automatic CEO Bootstrapping
if [ "$AUTO_BOOTSTRAP" = true ]; then
    echo "Bootstrapping initial admin (CEO)..."
    # Run the bootstrap command and print the result clearly in the logs
    BOOTSTRAP_OUTPUT=$(pnpm paperclipai auth bootstrap-ceo)
    echo "----------------------------------------------------------------"
    echo "INITIAL ADMIN SETUP REQUIRED"
    echo "$BOOTSTRAP_OUTPUT"
    echo "----------------------------------------------------------------"
fi

# 3. Start the application
echo "Starting Paperclip..."
exec "$@"
