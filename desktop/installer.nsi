; Setup program for Fizzbang Rally on Windows.
;
; Installs for the current user only, so it never asks for an administrator
; password: the program goes in the user's own Programs folder, with a
; shortcut on the Start menu and the desktop and an entry under "Installed
; apps" to remove it again.
;
; Built by scripts/build-desktop.mjs:   makensis -DVERSION=0.5.0 desktop/installer.nsi
; Silent install, for testing:          FizzbangRally-Setup.exe /S

Unicode true
!include "MUI2.nsh"

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!define NAME "Fizzbang Rally"
; The same without spaces, for the names of files.
!define FILE "FizzbangRally"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${NAME}"
; The name the game was first released under. (Written in two halves so that
; the rename script, which replaces the current name wherever it finds it,
; leaves this alone.)
!define FIRST_HALF "Truck"
!define FIRST_NAME "${FIRST_HALF}Build"
; Saved games live here whatever the game is called: see dataDir in
; launcher/main.go. Windows does not mind about capitals.
!define DATA_DIR "$LOCALAPPDATA\truckbuild"

Name "${NAME}"
OutFile "..\dist\${FILE}-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\${NAME}"
InstallDirRegKey HKCU "Software\${NAME}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
ManifestDPIAware true
BrandingText "${NAME} ${VERSION}"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${NAME}"
VIAddVersionKey "FileDescription" "${NAME} setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" ""

!define MUI_ICON "truckbuild.ico"
!define MUI_UNICON "truckbuild.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${FILE}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Play ${NAME} now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  ; A copy installed under the game's first name is replaced, not left
  ; beside this one. Its saved games stay where they are and carry over.
  StrCmp "${NAME}" "${FIRST_NAME}" renamed_done
    Delete "$SMPROGRAMS\${FIRST_NAME}.lnk"
    Delete "$DESKTOP\${FIRST_NAME}.lnk"
    RMDir /r "$LOCALAPPDATA\Programs\${FIRST_NAME}"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${FIRST_NAME}"
    DeleteRegKey HKCU "Software\${FIRST_NAME}"
  renamed_done:

  SetOutPath "$INSTDIR"
  File "..\dist\${FILE}.exe"
  File "truckbuild.ico"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateShortcut "$SMPROGRAMS\${NAME}.lnk" "$INSTDIR\${FILE}.exe" "" "$INSTDIR\truckbuild.ico"
  CreateShortcut "$DESKTOP\${NAME}.lnk" "$INSTDIR\${FILE}.exe" "" "$INSTDIR\truckbuild.ico"

  WriteRegStr HKCU "Software\${NAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "${NAME}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\truckbuild.ico"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\${NAME}.lnk"
  Delete "$DESKTOP\${NAME}.lnk"
  Delete "$INSTDIR\${FILE}.exe"
  Delete "$INSTDIR\truckbuild.ico"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  ; The game's own browser profile: saved coins, parts and tracks.
  RMDir /r "${DATA_DIR}\Profile"
  RMDir "${DATA_DIR}"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "Software\${NAME}"
SectionEnd
