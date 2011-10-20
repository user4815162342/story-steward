@echo off
rem Copyright 2011 Neil M. Sheldon
rem 
rem    Licensed under the Apache License, Version 2.0 (the "License");
rem    you may not use this file except in compliance with the License.
rem    You may obtain a copy of the License at
rem 
rem        http://www.apache.org/licenses/LICENSE-2.0
rem 
rem    Unless required by applicable law or agreed to in writing, software
rem    distributed under the License is distributed on an "AS IS" BASIS,
rem    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
rem    See the License for the specific language governing permissions and
rem    limitations under the License.
rem 
setlocal
rem Very simple batch file...
if "%1"=="" goto help
set devtarget=0
set reltarget=0
set shrinkdev=0
if "%2"=="development" set devtarget=1
if "%2"=="release" set reltarget=1
if "%1"=="shrinkdojo" if "%2"=="development" set shrinkdev=1
if "%2"=="all" set devtarget=1
if "%2"=="all" set reltarget=1
if "%2"=="" set devtarget=1
if "%2"=="" set reltarget=1
goto %1

:help
echo Usage: make action target
echo Available Actions: (default is 'application' if target is specified)
echo   dojo: cleans dojo custom build and recreates it for target.
echo   shrinkdojo: removes unnecessary files from the release target. This
echo               is done automatically by the dojo target, so this is usually
echo               unnecessary. In order to shrink the development site,
echo               shrinkdojo & development must be explicitly specified as
echo               parameters. This allows easier development against a non-shrunken
echo               dojo which might require additional components.
echo   touchdojo: makes sure the target dojo build has the same file lastmodified
echo              times as the source. Aids in synchronization. This is done
echo              automatically whenever shrinkdojo is called. It is only done
echo              to release, however, never to development, in order to save
echo              time in the build process.
echo   clean: cleans out application code for target. Does not touch dojo.
echo   application: copies application specific code for target.
echo   deploy: creates package from app code for target and places in deploy. 
echo           Copies app code as necessary, but Custom Dojo is not built.
echo   all: runs clean, dojo and deploy (which also runs app).   
echo Available Targets: (default is 'all' if action is specified, except 'shrinkDojo')
echo   development: Site includes debugging and testing code.
echo   release: Site includes only code required to run application.
echo   all: All targets are created.
goto :EOF

:dojo
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main buildDojo.js %~dp0 %devtarget% %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main shrinkDojo.js %~dp0 %shrinkdev% %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main touchDojo.js %~dp0 0 %reltarget%
goto :EOF

:shrinkdojo
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main shrinkDojo.js %~dp0 %shrinkdev% %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main touchDojo.js %~dp0 0 %reltarget%
goto :EOF

:touchdojo
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main touchDojo.js %~dp0 0 %reltarget%
goto :EOF

:justdojo
rem just build dojo, no shrinking
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main buildDojo.js %~dp0 %devtarget% %reltarget%

:clean
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main cleanApplication.js %~dp0 %devtarget% %reltarget%
goto :EOF

:application
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main buildApplication.js %~dp0 %devtarget% %reltarget%
goto :EOF

:deploy
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main buildApplication.js %~dp0 %devtarget% %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main deployApplication.js %~dp0 %devtarget% %reltarget%
goto :EOF

:all
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main cleanApplication.js %~dp0 %devtarget% %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main buildDojo.js %~dp0 %devtarget% %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main shrinkDojo.js %~dp0 %shrinkdev% %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main touchDojo.js %~dp0 0 %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main buildApplication.js %~dp0 %devtarget% %reltarget%
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main deployApplication.js %~dp0 %devtarget% %reltarget%
goto :EOF

:development
call %~f0 application development
goto :EOF

:release
call %~f0 application release
goto :EOF
