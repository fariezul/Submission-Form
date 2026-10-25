# ============================================================
#  deploy-semak.ps1
# ------------------------------------------------------------
#  Build, commit and push the SPM eligibility checker in one go,
#  then check that the live URL actually serves the new build.
#
#  Guna:
#     .\deploy-semak.ps1
#     .\deploy-semak.ps1 -Mesej "Betulkan syarat DTP"
#     .\deploy-semak.ps1 -BinaSahaja      # bina + salin Drive, tiada push
# ============================================================

param(
    [string] $Mesej      = "",
    [switch] $BinaSahaja
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

function Tajuk($teks) { Write-Host ""; Write-Host "== $teks" -ForegroundColor Cyan }

# ---------------------------------------------------------------
Tajuk "1/5  Bina fail"
& (Join-Path $here "build-semakan.ps1")

$keluaran = Join-Path $here "semakan-kelayakan.html"
$kb = [math]::Round((Get-Item $keluaran).Length / 1KB, 1)

# A quick guard: the built page must be self-contained. If a stray
# relative src/href ever creeps in, the live page breaks silently.
$html  = [IO.File]::ReadAllText($keluaran)
$luar  = [regex]::Matches($html, '(?:src|href)="(?!data:|#|https://)[^"]*"')
if ($luar.Count -gt 0) {
    Write-Host "GAGAL: fail merujuk $($luar.Count) sumber luar:" -ForegroundColor Red
    $luar | ForEach-Object { Write-Host "   $($_.Value)" }
    throw "Fail tidak self-contained. Betulkan dahulu."
}
Write-Host "   $kb KB, self-contained, tiada rujukan luar." -ForegroundColor Green

if ($BinaSahaja) {
    Write-Host ""
    Write-Host "Bina sahaja - tiada commit atau push." -ForegroundColor Yellow
    return
}

# ---------------------------------------------------------------
Tajuk "2/5  Semak apa yang berubah"
$berubah = git status --porcelain
if (-not $berubah) {
    Write-Host "   Tiada perubahan. Laman sudah terkini." -ForegroundColor Yellow
    return
}
git status --short

# The host guide must never reach this repo - it is the public site.
$bocor = git status --porcelain | Where-Object { $_ -match "Panduan_Host|panduan-host" }
if ($bocor) {
    Write-Host ""
    Write-Host "GAGAL: fail panduan host akan di-commit ke laman AWAM:" -ForegroundColor Red
    $bocor | ForEach-Object { Write-Host "   $_" }
    throw "Semak .gitignore. Panduan host tinggal di folder Drive sahaja."
}

# ---------------------------------------------------------------
Tajuk "3/5  Commit"
if (-not $Mesej) { $Mesej = "Kemas kini semakan kelayakan SPM" }

git add -A
$penuh = @"
$Mesej

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
"@
git commit -q -m $penuh
git log --oneline -1

# ---------------------------------------------------------------
Tajuk "4/5  Push ke GitHub (Vercel akan deploy)"
git push origin main
Write-Host "   Dihantar." -ForegroundColor Green

# ---------------------------------------------------------------
Tajuk "5/5  Sahkan laman sebenar"
$url = "https://farizuljaafar.com/semak"
$cap = ""
for ($i = 1; $i -le 10; $i++) {
    Start-Sleep -Seconds 6
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
        # The page carries its own programme count; use it as the signal
        # that Vercel is serving the NEW build and not a cached one.
        $bil = ([regex]::Matches($r.Content, '\{\s*kod:"')).Count
        $cap = "   Cubaan $i : HTTP $($r.StatusCode), $bil program"
        Write-Host $cap -ForegroundColor DarkGray
        if ($r.StatusCode -eq 200 -and $bil -gt 0) {
            Write-Host ""
            Write-Host "SIARAN LANGSUNG : $url  ($bil program)" -ForegroundColor Green
            return
        }
    } catch {
        Write-Host "   Cubaan $i : belum sedia ($($_.Exception.Message))" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Push berjaya tetapi laman belum mengesahkan selepas 60 saat." -ForegroundColor Yellow
Write-Host "Vercel mungkin masih membina. Semak sendiri: $url" -ForegroundColor Yellow
