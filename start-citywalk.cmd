@echo off
cd /d "%~dp0"
where node >nul 2>&1
if %errorlevel%==0 (
  node server.cjs
) else if exist "C:\Users\omelc\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  "C:\Users\omelc\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.cjs
) else (
  echo Node.js не найден. Установите Node.js или запустите проект в Codex.
)
pause
