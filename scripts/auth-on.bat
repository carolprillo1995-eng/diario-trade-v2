@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\set-auth-confirmation-mode.ps1" -Mode on
pause
