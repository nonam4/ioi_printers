@echo off
ping 127.0.0.1 -n 4 > nul
for %%i in (*.*) do if not "%%i"=="updater.bat" if not "%%i"=="unins000.exe" if not "%%i"=="unins000.dat" del /q "%%i" && RD /S /Q "C:\Program Files\Mundo Eletronico\locales" && RD /S /Q "C:\Program Files\Mundo Eletronico\resources" && RD /S /Q "C:\Program Files\Mundo Eletronico\swiftshader" && setlocal
cd /d %~dp0
Call :UnZipFile "C:\Program Files\Mundo Eletronico" "C:\Program Files\Mundo Eletronico\updates\wupdate.zip"
exit /b

:UnZipFile <ExtractTo> <newzipfile>
set vbs="%temp%\_.vbs"
if exist %vbs% del /f /q %vbs%
>%vbs%  echo Set fso = CreateObject("Scripting.FileSystemObject")
>>%vbs% echo If NOT fso.FolderExists(%1) Then
>>%vbs% echo fso.CreateFolder(%1)
>>%vbs% echo End If
>>%vbs% echo set objShell = CreateObject("Shell.Application")
>>%vbs% echo set FilesInZip=objShell.NameSpace(%2).items
>>%vbs% echo objShell.NameSpace(%1).CopyHere(FilesInZip)
>>%vbs% echo Set fso = Nothing
>>%vbs% echo Set objShell = Nothing
cscript //nologo %vbs%
if exist %vbs% del /f /q %vbs% && start "" Printers.exe
