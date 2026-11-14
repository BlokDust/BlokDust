; BlokDust Windows installer (CHG-0005 task 12), built by package.ps1 with Inno Setup 6 (`pnpm bd win package`).
; Unsigned for Release 1 (owner, 2026-11-11): SmartScreen shows "Windows protected your PC" (More info → Run anyway).
; VST3 plug-ins go where every DAW looks (Common Files\VST3); the BlokDust Standalone app and the licences to Program Files.
; BlokDust FX is a plug-in only (CHG-0010): no FX app.
#ifndef Version
  #error Pass /DVersion=x.y.z
#endif
#ifndef Build
  #error Pass /DBuild=<build dir>
#endif
#ifndef Src
  #error Pass /DSrc=<repo dir>
#endif

[Setup]
AppId={{6F0C2B7E-4E1A-4C47-9A9B-B10CD0510002}
AppName=BlokDust
AppVersion={#Version}
AppVerName=BlokDust {#Version}
AppPublisher=BlokDust contributors
AppPublisherURL=https://blokdust.funputs.com/
AppSupportURL=https://blokdust.funputs.com/
DefaultDirName={autopf}\BlokDust
DefaultGroupName=BlokDust
DisableProgramGroupPage=yes
OutputDir={#Build}\dist
OutputBaseFilename=BlokDust-{#Version}-Windows
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
MinVersion=10.0.17763
UninstallDisplayName=BlokDust {#Version}

[Types]
Name: "full"; Description: "VST3 plug-ins and the standalone app"
Name: "custom"; Description: "Choose"; Flags: iscustom

[Components]
Name: "vst3"; Description: "VST3 plug-ins: BlokDust and BlokDust FX (Common Files\VST3)"; Types: full custom
Name: "app"; Description: "Standalone app: BlokDust"; Types: full custom

[Files]
Source: "{#Build}\plugin\BlokDust_artefacts\Release\VST3\BlokDust.vst3\*"; DestDir: "{commoncf64}\VST3\BlokDust.vst3"; Components: vst3; Flags: recursesubdirs ignoreversion
Source: "{#Build}\plugin\BlokDustFX_artefacts\Release\VST3\BlokDust FX.vst3\*"; DestDir: "{commoncf64}\VST3\BlokDust FX.vst3"; Components: vst3; Flags: recursesubdirs ignoreversion
Source: "{#Build}\plugin\BlokDust_artefacts\Release\Standalone\BlokDust.exe"; DestDir: "{app}"; Components: app; Flags: ignoreversion
Source: "{#Src}\NOTICE.md"; DestDir: "{app}"; DestName: "NOTICE.txt"; Flags: ignoreversion
Source: "{#Src}\LICENSE"; DestDir: "{app}"; DestName: "LICENSE.txt"; Flags: ignoreversion

[Icons]
Name: "{group}\BlokDust"; Filename: "{app}\BlokDust.exe"; Components: app
Name: "{group}\Licences"; Filename: "{app}\NOTICE.txt"

[InstallDelete]
; 2.0.0 installed a BlokDust FX app; FX is a plug-in only from 2.0.1 (CHG-0010).
Type: files; Name: "{app}\BlokDust FX.exe"
Type: files; Name: "{group}\BlokDust FX.lnk"
