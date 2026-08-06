@echo off
echo =========================================
echo Starting Flight Game Server
echo Folder: Game Implementation
echo =========================================

REM Open the browser
start "" "http://localhost:8117/"

REM Run the python server
python server.py

pause
