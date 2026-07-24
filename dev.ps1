# 启动后端 (FastAPI + 阿里百炼)
# 需要先 cd 到 webapp 目录并设置 PYTHONPATH
Write-Host "=== 启动后端 (端口 18000) ===" -ForegroundColor Green
$env:PYTHONPATH = "."
Start-Process -NoNewWindow -FilePath ".venv\Scripts\python.exe" -ArgumentList "-m uvicorn backend.main:app --host 0.0.0.0 --port 18000 --reload"

Start-Sleep -Seconds 3

Write-Host "=== 启动前端 (端口 5173) ===" -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "npx.cmd" -ArgumentList "vite --host"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✔ 后端: http://localhost:18000/docs" -ForegroundColor Cyan
Write-Host "✔ 前端: http://localhost:5173" -ForegroundColor Cyan
