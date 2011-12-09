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
java -classpath ../vendor/dojo/util/shrinksafe/js.jar org.mozilla.javascript.tools.shell.Main make.js %~dp0 %1 %2 %3 %4 %5 %6 %7 %8 %9
