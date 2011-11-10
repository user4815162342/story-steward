; Based on a script found here: http://www.astuteq.de/blog/webrunner-packaging-howto/
;
; - Inno-Setup v5.4.2, IS-Tool v5.3.0.1
;
; SEE THE INNO-SETUP DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

; Macros, change to your needs
#define MyAppName "Story Steward"
#define MyAppVersion "0.9"
; NMS: TODO: Not sure what to put here, yet, was "My Company, Inc."
#define MyAppPublisher ""
#define MyAppURL "http://code.google.com/p/story-steward/"
; NMS: TODO: Again, not sure what to put here, was "MyApp.exe"
;#define MyAppExeName ""
#define MySetupOutputDir = "..\deploy"

#define MyFirefoxInstDir = "..\vendor\webrunner-components\firefox-6.0.2"
#define MyWebAppHomeDir = "..\vendor\webrunner-components\story.steward@webrunner.app"
#define MyStoryStewardReleaseDir = "..\release"

; The process for getting the revision number. Unfortunately, there's no 'pipe'.
#define _revisionCheck = Exec("revision.bat")
#if _revisionCheck
  #error Could not get svn revision number
#else
; Mark file for deletion
  #expr DeleteFile("revision.txt")
  #undef _revisionCheck
#endif
#define _revisionFile = FileOpen("revision.txt")
#if _revisionFile
  #define _revisionText = FileRead(_revisionFile)
  #expr FileClose(_revisionFile)
  #undef _revisionFile
  #define MyAppRevision = Trim(_revisionText)
  #undef _revisionText
#else
  #error Could not open revision number file
#endif

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{BD6876F0-7D33-4C1D-A7AD-6C5DDDA90907}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
DefaultDirName={pf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir={#MySetupOutputDir}
OutputBaseFilename=StorySteward-{#MyAppVersion}.{#MyAppRevision}-windows
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=none

[Languages]
Name: english; MessagesFile: compiler:Default.isl
;Name: german; MessagesFile: compiler:Languages\German.isl

[Tasks]
Name: desktopicon; Description: {cm:CreateDesktopIcon}; GroupDescription: {cm:AdditionalIcons}; Flags: unchecked
Name: quicklaunchicon; Description: {cm:CreateQuickLaunchIcon}; GroupDescription: {cm:AdditionalIcons}; Flags: unchecked

[Files]
Source: {#MyFireFoxInstDir}\*; Excludes: testpilot@labs.mozilla.com; Flags: recursesubdirs ignoreversion; DestDir: {app}
Source: {#MyWebAppHomeDir}\*; Excludes: profile,application.ini; Flags: recursesubdirs; DestDir: {app}\webapp
Source: {#MyWebAppHomeDir}\profile\extensions\*; Excludes: webrunner-packager@salsitasoft.com; Flags: recursesubdirs; DestDir: {userappdata}\WebApps\{#MyAppName}\Profile\extensions
; NMS: Removed the next line as file was not found (probably because I'm using FF 6, not 5).
;Source: {#MyWebAppHomeDir}\profile\extensions\webrunner@salsitasoft.com\stub\portalMAPI.dll; DestDir: {app}\webapp\stub; Flags: ignoreversion
Source: {#MyWebAppHomeDir}\profile\extensions\webrunner@salsitasoft.com\stub\application.ini; DestDir: {app}\webapp\stub; Flags: ignoreversion; AfterInstall: MyAfterInstall()
;Optional: If you want to deliver a special base userChrome.css with your webapp
; NMS: Removed the next two lines as file was not found (probably because I'm using FF 6, not 5).
;Source: {#MyWebAppHomeDir}\profile\chrome\*; Excludes: userChrome.css; Flags: ignoreversion; DestDir: {userappdata}\WebApps\{code:GetName}\Profile\chrome
;Source: {#MyWebAppHomeDir}\profile\chrome\userChrome.css; Flags: ignoreversion; DestDir: {userappdata}\WebApps\{code:GetName}\Profile\chrome; AfterInstall: MyAfterInstalluserChrome(ExpandConstant('{code:GetName}'))
Source: {#MyStoryStewardReleaseDir}\*; Flags: recursesubdirs ignoreversion; DestDir: {app}\storysteward

[Icons]
Name: {group}\{#MyAppName}; Filename: {app}\webapp\stub\webrunner.exe; Parameters: "-webapp ""{app}\webapp"""; WorkingDir: {app}; IconFilename: {app}\webapp\icons\default\main-window.ico; IconIndex: 0
Name: {group}\{cm:UninstallProgram,{#MyAppName}}; Filename: {uninstallexe}
Name: {commondesktop}\{#MyAppName}; Filename: {app}\webapp\stub\webrunner.exe; Tasks: desktopicon; Parameters: "-webapp ""{app}\webapp"""; WorkingDir: {app}; IconFilename: {app}\webapp\icons\default\main-window.ico; IconIndex: 0

[Run]
Filename: {app}\webapp\stub\webrunner.exe; Description: {cm:LaunchProgram,{#MyAppName}}; Flags: nowait postinstall skipifsilent; Parameters: "-webapp ""{app}\webapp"""; WorkingDir: {app}

[Registry]
;Registry Keys (if you need some?)

[UninstallDelete]
Name: {app}\*; Type: filesandordirs
Name: {userappdata}\WebApps\{#MyAppName}\*; Type: filesandordirs
Name: {app}; Type: filesandordirs

[Code]

procedure MyAfterInstall();
var
  ExpandedFileName : String;
  uri : String;
  name: String;

begin
  //post installation code: prepare application.ini, webapp.ini, etc.

  ExpandedFileName := ExpandConstant(CurrentFileName);
  name := '{#MyAppName}';

  //prepare application.ini
  SaveStringToFile(ExpandedFileName, #13 '[Environment]' #13, True);
  SaveStringToFile(ExpandedFileName, 'GRE_HOME=' +  ExpandConstant('{app}') + '' #13, True);
  SaveStringToFile(ExpandedFileName, 'XRE_PROFILE_PATH=' + ExpandConstant('{userappdata}') + '\WebApps\' + name + '\Profile' + #13, True);
  //MsgBox('MyAfterInstall server = ' + server + ' dir = ' + ExpandConstant('{app}'), mbInformation, MB_OK);

  //build webapp-uri
  uri := ExpandConstant('{app}');
  StringChangeEx(uri, '\', '/', True);
  uri := 'file:///' + uri + '/storysteward/index.html';
  //MsgBox('MyAfterInstall uri = ' + uri, mbInformation, MB_OK);

  //prepare webapp.ini
  SetIniString('Parameters', 'uri', uri, ExpandConstant('{app}') + '\webapp\webapp.ini');
  //MsgBox('MyAfterInstall name = ' + name, mbInformation, MB_OK);
  SetIniString('Parameters', 'name', name, ExpandConstant('{app}') + '\webapp\webapp.ini');
  SetIniString('App', 'Name', name, ExpandConstant('{app}') + '\webapp\override.ini');
end;
