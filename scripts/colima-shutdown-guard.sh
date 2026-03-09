#!/bin/bash
# Colima graceful shutdown guard
# Runs as a macOS LaunchDaemon — traps SIGTERM (sent on Mac shutdown/reboot)
# and runs "colima stop" so Postgres can flush WAL before the VM dies.
#
# INSTALL (one-time, needs sudo):
#   sudo cp scripts/colima-shutdown-guard.sh /usr/local/bin/colima-shutdown-guard.sh
#   sudo chmod +x /usr/local/bin/colima-shutdown-guard.sh
#   sudo cp scripts/com.colima.graceful-shutdown.plist /Library/LaunchDaemons/
#   sudo launchctl load /Library/LaunchDaemons/com.colima.graceful-shutdown.plist
#
# VERIFY:
#   sudo launchctl list | grep colima
#
# LOGS:
#   cat /tmp/colima-shutdown.log
#
# UNINSTALL:
#   sudo launchctl unload /Library/LaunchDaemons/com.colima.graceful-shutdown.plist
#   sudo rm /Library/LaunchDaemons/com.colima.graceful-shutdown.plist
#   sudo rm /usr/local/bin/colima-shutdown-guard.sh

cleanup() {
    echo "[$(date)] macOS shutdown detected — running colima stop..." >> /tmp/colima-shutdown.log
    /opt/homebrew/bin/colima stop --timeout 90 >> /tmp/colima-shutdown.log 2>&1
    echo "[$(date)] colima stop done." >> /tmp/colima-shutdown.log
    exit 0
}

trap cleanup SIGTERM SIGINT

echo "[$(date)] colima-shutdown-guard started (PID $$)" >> /tmp/colima-shutdown.log

while true; do
    sleep 60 &
    wait $!
done
