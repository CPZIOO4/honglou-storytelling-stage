$ErrorActionPreference='Stop'
# Use this PowerShell's matching built-in modules, even when launched from another runtime.
$env:PSModulePath=Join-Path $PSHOME 'Modules'
$secret=Read-Host '输入 DeepSeek API Key（输入不会显示）' -AsSecureString
$secretDir=Join-Path $env:LOCALAPPDATA 'HonglouStage'
New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
$secret | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $secretDir 'deepseek.key') -Encoding ascii
Write-Output '已用当前 Windows 用户加密保存。密钥没有写入项目目录。'
