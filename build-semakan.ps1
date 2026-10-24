# ============================================================
#  build-semakan.ps1
# ------------------------------------------------------------
#  Inlines the logo and the program data into the template and
#  writes the self-contained  semakan-kelayakan.html .
#
#  Run it after editing either source file:
#      .\build-semakan.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

$template = Join-Path $here "semakan-kelayakan.src.html"
$data     = Join-Path $here "semakan-kelayakan-data.js"
$logo     = Join-Path $here "tvetmara-logo.png"
$output   = Join-Path $here "semakan-kelayakan.html"

foreach ($f in @($template, $data, $logo)) {
    if (-not (Test-Path $f)) { throw "Missing source file: $f" }
}

# --- logo -> base64 data URI -------------------------------------------
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($logo))
$uri = "data:image/png;base64,$b64"

# --- read sources ------------------------------------------------------
$html = [IO.File]::ReadAllText($template)
$js   = [IO.File]::ReadAllText($data)

# --- substitute --------------------------------------------------------
# Plain .Replace(), not -replace: the base64 and the JS both contain
# characters that the regex engine would treat as metacharacters.
$html = $html.Replace("__LOGO__", $uri)
$html = $html.Replace("/*__DATA__*/", $js)

if ($html.Contains("__LOGO__") -or $html.Contains("/*__DATA__*/")) {
    throw "A placeholder was not substituted - check the template."
}

# --- write (UTF-8, no BOM) --------------------------------------------
$enc = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($output, $html, $enc)

$kb = [math]::Round((Get-Item $output).Length / 1KB, 1)
Write-Host "Built semakan-kelayakan.html  ($kb KB, self-contained)"

# --- mirror to the TikTok Drive workspace so hosts always get the
#     current build. Skipped silently when the drive is not mounted,
#     so the build never fails away from that machine.
$drive = "G:\My Drive\TIKTOK TVETMARA MASJID TANAH"
if (Test-Path -LiteralPath $drive) {
    $salinan = Join-Path $drive "semakan-kelayakan.html"
    try {
        Copy-Item -LiteralPath $output -Destination $salinan -Force
        Write-Host "Mirrored to Drive             (host copy updated)"
    } catch {
        Write-Warning "Could not update the Drive copy: $($_.Exception.Message)"
    }
} else {
    Write-Host "Drive workspace not mounted   (host copy not updated)"
}
