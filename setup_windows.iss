#define MyAppName "Mundo Eletronico"
#define MyAppPublisher "Mundo Eletronico"
#define MyAppURL "https://grupomundoeletronico.com.br/"
#define MyAppExeName "Printers.exe"

[Setup]
AppId={{5B856DA2-3BF1-42C2-9E61-DEC57827B418}
AppName={#MyAppName}
AppVerName={#MyAppName}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName=C:\Program Files\{#MyAppName}
DisableDirPage=yes
DisableWelcomePage=yes
DisableProgramGroupPage=yes
LicenseFile=D:\Projetos\ioi_printers\license.txt
OutputDir=D:\Projetos\ioi_printers\releases
OutputBaseFilename=setup_windows
SetupIconFile=D:\Projetos\ioi_printers\icon.ico
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Dirs]
Name: "{app}"; Permissions: everyone-full

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
Source: "D:\Projetos\ioi_printers\dist\win-ia32-unpacked\Printers.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\Projetos\ioi_printers\dist\win-ia32-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Permissions: everyone-full

[Icons] 
Name: "{commonstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

[Run]
Filename: "{app}\Printers.exe"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: runascurrentuser nowait postinstall skipifsilent
