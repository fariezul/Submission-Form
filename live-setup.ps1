# ============================================================
#  live-setup.ps1
# ------------------------------------------------------------
#  Susun dua tetingkap Chrome untuk sesi LIVE:
#
#    KIRI   alat semakan, mod app (tiada tab, tiada bar alamat)
#           - ini yang dirakam telefon
#    KANAN  Chrome biasa untuk anda - TikTok LIVE, carian, komen
#           - di luar bingkai kamera
#
#  Guna:
#     .\live-setup.ps1                  buka kedua-duanya dan susun
#     .\live-setup.ps1 -SusunSahaja     susun semula yang sedia terbuka
#     .\live-setup.ps1 -Laman "https://www.tiktok.com/@tvetmara_masjidtanah"
#     .\live-setup.ps1 -Lebar 450       paksa lebar panel kiri
#
#  Nota: browser TIDAK boleh dibenamkan dalam halaman alat.
#  tiktok.com, google.com, duckduckgo.com dan bing.com semuanya
#  hantar X-Frame-Options: SAMEORIGIN, jadi iframe akan kosong.
#  Dua tetingkap ialah satu-satunya cara yang berfungsi.
# ============================================================

param(
    [string] $Laman       = "https://www.tiktok.com/live",
    [int]    $Lebar       = 0,
    [switch] $SusunSahaja
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Tkp {
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int t,bool r);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int cmd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  public struct R { public int L,T,Rt,B; }
}
"@ -ErrorAction SilentlyContinue

# --- ukur skrin ------------------------------------------------------
Add-Type -AssemblyName System.Windows.Forms
$kerja = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$W = $kerja.Width
$H = $kerja.Height

# Pentas ialah kanvas tetap 1080x1920 yang diskala untuk muat, jadi
# lebar tetingkap yang padan tanpa jalur hitam = tinggi x (1080/1920).
if ($Lebar -le 0) { $Lebar = [math]::Round($H * 1080 / 1920) }
$kananX = $Lebar
$kananW = $W - $Lebar

Write-Host ""
Write-Host "Skrin  : $W x $H" -ForegroundColor Cyan
Write-Host "Kiri   : ${Lebar}px  - alat semakan (dirakam telefon)" -ForegroundColor Cyan
Write-Host "Kanan  : ${kananW}px - Chrome untuk anda" -ForegroundColor Cyan
Write-Host ""
if ($kananW -lt 400) { Write-Warning "Ruang kanan hanya ${kananW}px. Cuba -Lebar lebih kecil." }

function Cari-Tetingkap([string] $corak, [bool] $bukanCorak = $false) {
    Get-Process chrome -ErrorAction SilentlyContinue |
      Where-Object {
          $_.MainWindowHandle -ne 0 -and
          [Tkp]::IsWindowVisible($_.MainWindowHandle) -and
          $_.MainWindowTitle -and
          ( ($bukanCorak -and $_.MainWindowTitle -notlike $corak) -or
            ((-not $bukanCorak) -and $_.MainWindowTitle -like $corak) )
      } | Select-Object -First 1
}

function Letak($proses, $x, $y, $w, $h, $nama) {
    if (-not $proses) { Write-Warning "$nama tidak dijumpai."; return $false }
    [void][Tkp]::ShowWindow($proses.MainWindowHandle, 9)   # SW_RESTORE
    Start-Sleep -Milliseconds 250
    [void][Tkp]::MoveWindow($proses.MainWindowHandle, $x, $y, $w, $h, $true)
    Start-Sleep -Milliseconds 250
    $r = New-Object Tkp+R
    [void][Tkp]::GetWindowRect($proses.MainWindowHandle, [ref]$r)
    Write-Host ("   {0,-14} x={1} y={2} {3}x{4}" -f $nama, $r.L, $r.T, ($r.Rt-$r.L), ($r.B-$r.T)) -ForegroundColor DarkGray
    return $true
}

# --- buka (kecuali -SusunSahaja) -------------------------------------
if (-not $SusunSahaja) {
    $chrome = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $chrome) { throw "Chrome tidak dijumpai." }

    $alat = Join-Path $here "semakan-kelayakan.html"
    if (-not (Test-Path $alat)) { throw "Tiada $alat - jalankan build-semakan.ps1 dahulu." }

    if (-not (Cari-Tetingkap "*Semakan Kelayakan*")) {
        # Profil berasingan supaya tetingkap ini jadi proses sendiri dan
        # tidak bergabung dengan tetingkap kerja anda.
        & $chrome "--app=$(([uri]$alat).AbsoluteUri)" `
                  "--user-data-dir=$(Join-Path $env:LOCALAPPDATA 'ChromeLiveAlat')" `
                  "--no-first-run" "--no-default-browser-check"
        Start-Sleep -Seconds 2
    }
    if (-not (Cari-Tetingkap "*Semakan Kelayakan*" $true)) {
        & $chrome "--new-window" $Laman
        Start-Sleep -Seconds 3
    }
}

# --- susun -----------------------------------------------------------
# Chrome mengabaikan --window-position/--window-size apabila satu proses
# Chrome sudah berjalan: arahan dihantar ke proses sedia ada, yang guna
# geometri tersimpannya sendiri. Jadi kedudukan ditetapkan melalui Win32
# selepas tetingkap wujud - itu yang betul-betul berkesan.
Write-Host "Menyusun:" -ForegroundColor Cyan
$okKiri  = Letak (Cari-Tetingkap "*Semakan Kelayakan*")       0       0 $Lebar  $H "Alat"
$okKanan = Letak (Cari-Tetingkap "*Semakan Kelayakan*" $true) $kananX 0 $kananW $H "Browser"

Write-Host ""
if ($okKiri -and $okKanan) {
    Write-Host "Siap. Dua tetingkap bersebelahan." -ForegroundColor Green
} else {
    Write-Warning "Sebahagian tetingkap tidak disusun - buka sendiri, kemudian jalankan -SusunSahaja."
}
Write-Host ""
Write-Host "KIRI  : jangan tekan F (skrin penuh akan menutup ruang kanan)." -ForegroundColor Yellow
Write-Host "        Mod app tiada tab/bar alamat, jadi bersih untuk kamera."
Write-Host "        Kekunci kekal: Enter, N, S, C, R, T, M"
Write-Host "KANAN : milik anda. Telefon tidak merakamnya." -ForegroundColor Yellow
Write-Host ""
Write-Host "Tersasar semasa LIVE?  .\live-setup.ps1 -SusunSahaja" -ForegroundColor DarkGray
