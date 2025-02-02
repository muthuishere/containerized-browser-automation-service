#!/bin/bash
/usr/bin/openbox --replace &
sleep 3
openbox --reconfigure
# Prevent the script from exiting
tail -f /dev/null
