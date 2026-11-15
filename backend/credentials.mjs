import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
const run=promisify(execFile);
export const credentialPath=()=>join(process.env.LOCALAPPDATA||'', 'HonglouStage','deepseek.key');
export const hasCredential=()=>!!process.env.DEEPSEEK_API_KEY||(process.platform==='win32'&&existsSync(credentialPath()));
export async function readCredential(){
 if(process.env.DEEPSEEK_API_KEY)return process.env.DEEPSEEK_API_KEY.trim();
 if(!hasCredential())throw Error('尚未配置本地 DeepSeek 密钥');
 const script="$ErrorActionPreference='Stop'; $cipher=(Get-Content -LiteralPath (Join-Path $env:LOCALAPPDATA 'HonglouStage/deepseek.key') -Raw).Trim(); $s=ConvertTo-SecureString $cipher; $p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); try {[Console]::Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($p))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}";
 try{const env={...process.env,PSModulePath:join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/Modules')};const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{env,windowsHide:true,timeout:10000,maxBuffer:8192});if(!stdout.trim())throw Error('empty');return stdout.trim();}
 catch{throw Error('无法解密本机保存的 DeepSeek 密钥');}
}
