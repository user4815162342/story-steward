@ECHO OFF
SETLOCAL
SET CWRSYNCHOME=%PROGRAMFILES%\CWRSYNC
SET HOME=%APPDATA%
SET CWOLDPATH=%PATH%
SET PATH=%CWRSYNCHOME%\BIN;%PATH%

SET BASEOPTS=-vrtO --progress --existing
REM -v, --verbose               increase verbosity
REM -r, --recursive             recurse into directories
REM -t, --times                 preserve modification times
REM     --progress              show progress during transfer
REM  -O, --omit-dir-times       prevents changing of directory times. This is basically more of a workaround:
REM                             without it, rsync wants to touch the "./" directory, which can't be done
REM                             on the staging server, at least.
REM --existing                  Since we are only doing this to 'touch' the files, there is 
REM                             no need to copy new files. This will ensure that only existing 
REM                             files are changed.

rsync %BASEOPTS% "%1" "%2"

