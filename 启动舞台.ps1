param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$projectRoot=$PSScriptRoot
$runtimeDir=Join-Path $projectRoot '.runtime'
$stateFile=Join-Path $runtimeDir 'server.json'
if(Test-Path -LiteralPath $stateFile){
  $state=Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
  $existing=Get-CimInstance Win32_Process -Filter "ProcessId=$($state.pid)" -ErrorAction SilentlyContinue
  if($existing -and $existing.CommandLine.Contains((Join-Path $projectRoot 'server.mjs'))){if(-not $NoBrowser){Start-Process 'http://127.0.0.1:4173'};return}
}
$nodeCommand=Get-Command node -ErrorAction SilentlyContinue
if(-not $nodeCommand){throw '请先安装 Node.js 20 或以上版本。'}
$listener=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue
if($listener){throw '4173 端口已被其他服务使用；本脚本不会终止该服务。'}
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$entry=Join-Path $projectRoot 'server.mjs'
$proc=Start-Process -FilePath $nodeCommand.Source -ArgumentList @(('"'+$entry+'"')) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log')
@{pid=$proc.Id;entry=$entry;started=(Get-Date).ToString('o');owner='honglou-storytelling-stage local preview'} | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding utf8
$ready=$false
for($i=0;$i -lt 30;$i++){
  try{$health=Invoke-RestMethod 'http://127.0.0.1:4173/health' -TimeoutSec 1;if($health.app -eq 'honglou-stage'){$ready=$true;break}}catch{}
  Start-Sleep -Milliseconds 200
}
if(-not $ready){
  $current=Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.Id)" -ErrorAction SilentlyContinue
  if($current -and $current.CommandLine.Contains($entry)){Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue}
  throw '舞台服务未能启动，请查看 .runtime/server-error.log。'
}
if(-not $NoBrowser){Start-Process 'http://127.0.0.1:4173'}
Write-Output '舞台已启动。结束时运行同目录的“停止舞台.ps1”。'
