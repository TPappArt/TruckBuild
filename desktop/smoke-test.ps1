# Checks the Windows build on a real Windows machine: the program serves the
# game, the setup program installs it, the installed game opens a window,
# closing the window stops it, and the uninstaller removes it. Leaves a
# screenshot in dist\. Used by .github/workflows/installers.yml.
#
#   pwsh desktop/smoke-test.ps1

$ErrorActionPreference = 'Stop'
$name = 'TruckBuild'
$installed = Join-Path $env:LOCALAPPDATA "Programs\$name"
function Note($text) { Write-Output "::notice title=Windows test::$text" }
function Fail($text) { Write-Output "::error title=Windows test::$text"; exit 1 }

# 1. The program on its own.
$test = Start-Process "dist\$name.exe" -ArgumentList '--selftest' -Wait -PassThru -RedirectStandardOutput 'dist\selftest.txt'
Get-Content 'dist\selftest.txt'
if ($test.ExitCode -ne 0) { Fail "The program's self-test failed: $(Get-Content 'dist\selftest.txt' -Raw)" }
Note 'The program serves the game (self-test passed).'

# 2. Setup, without asking anything.
$setup = Start-Process "dist\$name-Setup.exe" -ArgumentList '/S' -Wait -PassThru
if ($setup.ExitCode -ne 0) { Fail "Setup ended with code $($setup.ExitCode)." }
$shortcut = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\$name.lnk"
foreach ($path in @("$installed\$name.exe", "$installed\Uninstall.exe", $shortcut, (Join-Path ([Environment]::GetFolderPath('Desktop')) "$name.lnk"))) {
  if (-not (Test-Path $path)) { Fail "Setup did not create $path" }
}
$entry = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\$name" -ErrorAction SilentlyContinue
if (-not $entry) { Fail 'Setup did not add the game to the list of installed apps.' }
Note "Setup installed version $($entry.DisplayVersion) with Start menu and desktop shortcuts."

# 3. The installed game, started the way a player would.
Start-Process "$installed\$name.exe"
Start-Sleep -Seconds 20
try {
  $page = Invoke-WebRequest 'http://127.0.0.1:47615/' -UseBasicParsing
  if ($page.StatusCode -ne 200) { Fail "The running game answered $($page.StatusCode)." }
} catch { Fail "The running game did not answer: $_" }
$windows = @(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '--app=http://127\.0\.0\.1:47615' })
$browser = if ($windows.Count) { $windows[0].Name } else { 'none' }
Note "The game is running. Window opened by: $browser ($($windows.Count) processes)."
try {
  Add-Type -AssemblyName System.Windows.Forms, System.Drawing
  $screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($screen.Left, $screen.Top, 0, 0, $bitmap.Size)
  $bitmap.Save((Join-Path (Get-Location) 'dist\windows-running.png'))
  Note "Took a screenshot, $($screen.Width)x$($screen.Height)."
} catch { Write-Output "::warning title=Windows test::No screenshot: $_" }
if ($windows.Count -eq 0) { Fail 'No app window was opened.' }

# 4. Closing the window stops the game.
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'TruckBuild\\Profile' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 12
if (Get-Process $name -ErrorAction SilentlyContinue) { Fail 'The game kept running after its window was closed.' }
Note 'The game stopped by itself once its window was closed.'

# 5. Uninstall. (The uninstaller hands over to a copy of itself and returns at once.)
Start-Process "$installed\Uninstall.exe" -ArgumentList '/S' -Wait
Start-Sleep -Seconds 8
if (Test-Path "$installed\$name.exe") { Fail 'The uninstaller left the program behind.' }
if (Test-Path $shortcut) { Fail 'The uninstaller left the Start menu shortcut behind.' }
Note 'The uninstaller removed the game and its shortcuts.'
