# Script to connect GitHub repository to Vercel project
# Usage: .\scripts\connect-github-to-vercel.ps1 -VercelToken "your-token"

param(
    [Parameter(Mandatory=$true)]
    [string]$VercelToken,
    
    [string]$ProjectId = "prj_qizL57pexEXowI4AFrKqi0j8LUqT",
    [string]$TeamId = "team_iKYdOikYAesZlPc1yfweSDWJ",
    [string]$GitHubRepo = "ydvvpn197-netizen/theglocal_phase2",
    [string]$GitBranch = "main"
)

$headers = @{
    "Authorization" = "Bearer $VercelToken"
    "Content-Type" = "application/json"
}

$url = "https://api.vercel.com/v9/projects/$ProjectId"
if ($TeamId) {
    $url += "?teamId=$TeamId"
}

$body = @{
    gitRepository = @{
        type = "github"
        repo = $GitHubRepo
        productionBranch = $GitBranch
    }
} | ConvertTo-Json -Depth 10

try {
    Write-Host "Connecting GitHub repository $GitHubRepo to Vercel project $ProjectId..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $url -Method PATCH -Headers $headers -Body $body
    
    Write-Host "Successfully connected GitHub repository to Vercel!" -ForegroundColor Green
    Write-Host "Repository: $GitHubRepo" -ForegroundColor Green
    Write-Host "Branch: $GitBranch" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Push to GitHub: git push origin main" -ForegroundColor Yellow
    Write-Host "2. Vercel will automatically deploy on every push" -ForegroundColor Yellow
    
    return $response
} catch {
    Write-Host "Error connecting repository: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

