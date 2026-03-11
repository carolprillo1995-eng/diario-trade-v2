# Script de verificacao
cd C:\React\diario-trader
Write-Host "=== VERIFICANDO ARQUIVO ===" -ForegroundColor Cyan
$result = Select-String -Path "src\DiarioTrader.jsx" -Pattern "PainelMargem"
if ($result) {
    Write-Host "✅ Arquivo CORRETO - PainelMargem encontrado ($($result.Count) ocorrencias)" -ForegroundColor Green
} else {
    Write-Host "❌ Arquivo INCORRETO - Cole o conteudo novamente!" -ForegroundColor Red
}
$lines = (Get-Content "src\DiarioTrader.jsx").Count
Write-Host "Total de linhas: $lines (deve ser ~1387)" -ForegroundColor Yellow
