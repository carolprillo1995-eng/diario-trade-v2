param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("on", "off")]
  [string]$Mode,

  [string]$ProjectRef = "qqgoojzlhczfexqlgvpe",
  [string]$ConfigPath = "supabase/config.toml"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $ConfigPath)) {
  Write-Error "Arquivo não encontrado: $ConfigPath"
}

$smtpHost = $env:SMTP_HOST
$smtpUser = $env:SMTP_USER
$smtpPass = $env:SMTP_PASS
$smtpAdminEmail = $env:SMTP_ADMIN_EMAIL
$smtpSenderName = $env:SMTP_SENDER_NAME

if ([string]::IsNullOrWhiteSpace($smtpHost) -or
    [string]::IsNullOrWhiteSpace($smtpUser) -or
    [string]::IsNullOrWhiteSpace($smtpPass) -or
    [string]::IsNullOrWhiteSpace($smtpAdminEmail) -or
    [string]::IsNullOrWhiteSpace($smtpSenderName)) {
  Write-Host "Defina as variáveis SMTP antes de rodar:" -ForegroundColor Yellow
  Write-Host "  `$env:SMTP_HOST='smtp-relay.brevo.com'"
  Write-Host "  `$env:SMTP_USER='SEU_LOGIN_SMTP'"
  Write-Host "  `$env:SMTP_PASS='SUA_SENHA_SMTP'"
  Write-Host "  `$env:SMTP_ADMIN_EMAIL='seu-email@dominio.com'"
  Write-Host "  `$env:SMTP_SENDER_NAME='TradeVision'"
  exit 1
}

$config = Get-Content -Raw -Path $ConfigPath

if ($Mode -eq "on") {
  $config = $config -replace 'enable_confirmations\s*=\s*false', 'enable_confirmations = true'
  Write-Host "Modo selecionado: CONFIRMAÇÃO POR EMAIL LIGADA" -ForegroundColor Green
}
else {
  $config = $config -replace 'enable_confirmations\s*=\s*true', 'enable_confirmations = false'
  Write-Host "Modo selecionado: CONFIRMAÇÃO POR EMAIL DESLIGADA" -ForegroundColor Yellow
}

Set-Content -Path $ConfigPath -Value $config -Encoding UTF8

Write-Host "Aplicando configuração no projeto remoto..." -ForegroundColor Cyan
"Y" | supabase config push --project-ref $ProjectRef

Write-Host "Concluído." -ForegroundColor Green
