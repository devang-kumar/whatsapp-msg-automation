; Inno Setup Script — WhatsApp Bulk Messenger
; Build: Run this file with Inno Setup Compiler (https://jrsoftware.org/isinfo.php)
; Prerequisites: Run build_exe.bat first to generate dist\WhatsApp Bulk Messenger.exe

#define AppName "WhatsApp Bulk Messenger"
#define AppVersion "1.0.0"
#define AppPublisher "Devang Kumar"
#define AppURL "https://github.com/devang-kumar/whatsapp-msg-automation"
#define AppExeName "WhatsApp Bulk Messenger.exe"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=dist
OutputBaseFilename=WhatsApp-Bulk-Messenger-Setup
SetupIconFile=static\icons\icon-192.png
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\{#AppExeName}
; Minimum Windows 10
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
; The bundled .exe produced by PyInstaller
Source: "dist\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Start Menu
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
; Desktop (optional)
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
; Offer to launch after install
Filename: "{app}\{#AppExeName}"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Clean up Chrome profile saved by the app
Type: filesandordirs; Name: "{localappdata}\WhatsAppBulkProfile"
