$ErrorActionPreference='Stop'
$stateFile=Join-Path $PSScriptRoot '.runtime/server.json'
if(-not (Test-Path -LiteralPath $stateFile)){Write-Output '没有本脚本启动的舞台服务。';return}
$state=Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
$entry=Join-Path $PSScriptRoot 'server.mjs'
$current=Get-CimInstance Win32_Process -Filter "ProcessId=$($state.pid)" -ErrorAction SilentlyContinue
if($current){
  if(-not $current.CommandLine.Contains($entry)){throw 'PID 已被其他进程使用；未停止任何进程。'}
  Stop-Process -Id $state.pid
  Wait-Process -Id $state.pid -Timeout 5 -ErrorAction SilentlyContinue
}
Remove-Item -LiteralPath $stateFile
Write-Output '本项目的舞台服务已停止。'
