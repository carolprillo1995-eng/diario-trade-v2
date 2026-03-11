Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c cd /d """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & """ && python tv_server.py", 0, False
