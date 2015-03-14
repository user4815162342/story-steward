# Introduction #

Unfortunately, a number of factors make the process for creating the packages found in the downloads section relatively tedious. Fortunately, most of it is done via scripts, and after the initial build, quick building for development and testing is a snap.

However, initial set up for building requires a number of steps. Also, a full 'make all' can take a long time (could be as much as an hour on older machines).

# Requirements #

There are several third-party tools and libraries which are not included in source control due to their size, and due to my dislike of duplicating repositories (All of these are open source). If you are unable to obtain the required versions as listed below, let me know and I'd be willing to upload them to a file transfer site for you. Newer versions may work, but haven't been tested.

Tools:
  * Java Runtime (My version is 1.6, I have not tried it with earlier versions)
  * On Windows: Windows Batch File interpreter (cmd --version on my old machine produced 5.1.2600) (NOTE: I've recently switched to linux, and some changes have been made which might have broken Windows building)
  * On Linux: bash
  * Subversion command line client, with svnversion command (My version is 1.6.15)
  * [node-webkit](https://github.com/rogerwang/node-webkit) for all operating systems you need to build for. (Last successful tests and build ran on 0.3.7)

Libraries:
  * Dojo Toolkit v1.5 full source build
  * Math.uuid.js v1.4 from http://www.broofa.com
  * famfamfam Silk Icons v1.3 (only if you plan on modifying the icons
  * A json schema validator script which I can't find the origin for anymore, and you'll have to get from me.

# Setup #

1) Make sure you have checked out the latest source into a directory structure that looks like this:

  * build/
  * documentation/
  * resources/
  * source/
  * test/

2) Now, at the same level as the above, create the following directories:

  * vendor/
  * development/
  * release/
  * deploy/

3) Unzip the dojo toolkit source build into vendor, so that you end up with a directory structure something like this:

  * vendor/
    * dojo/
      * dojo/
      * dijit/
      * dojox/
      * util/

4) Place the Math.uuid.js script directly under vendor, and unzip the famfamfam file into a directory called famfam-silkicons. The json schema validator goes in a folder called json-schema here.

5) Unzip the node-webkit installs into the following structure:
  * vendor/
    * node-webkit/
      * node-webkit-linux-x64
      * node-webkit-linux-ia32
      * node-webkit-win-ia32
      * ...etc.

6) Make sure the java runtime and svn command line are set up on your path environment variable.

7) If you are creating a package to deploy for this project page: Make sure all code is updated and committed to the repository, so that the version number doesn't get an 'M' after it. If you are creating a fork package for your own distribution, please edit the build/info.js script so that the resulting filenames differ in some meaningful manner.

# Building #

Assuming everything is working right, open up a command shell and change to the build directory in the structure above. Run './make.sh' to see a basic usage for the script.

## Building Custom Dojo ##

The first time you start building, you will want to create the custom build of dojo in your release and development directories. This is the longest part of the build process, however as long as you are not adding any new dojo components, or changing the build scripts, you should only ever need to run this once.

To build the custom dojo scripts, simply run 'make dojo'. This will create the custom build scripts, and shrink the 'release' target by removing unneeded components from the dojo library.

If you also want to shrink the 'development' target, you will need to explicitly state 'make dojo all' or 'make dojo development'. However, only do this if you do not plan on adding new dojo components to the basic Story Steward code.

## Building for Testing Changes ##

After this, whenever you make changes, you will want to test them from the 'development' or 'release' directories. The main difference between these is that the dojo scripts aren't quite as compact, and therefore little easier to debug in the development release.

In order to test them, you simply need to populate the changes via 'make application'. You can optionally specify the target 'development' or 'release' as a second parameter.

Sometimes, you may want to call 'make clean' first. This will clean out all of the application code, but not the dojo code, so you can be sure there aren't some old files sticking around.

## Building for Deployment ##

When you are ready to create deployment packages, call 'make deploy', optionally specifying 'development' or 'release'. This process also takes a while, although not nearly as long as building the custom dojo.

## Building 'icons.png' ##

If you want to make changes to the icons used in the application, you will need to regenerate icons.png. This is not done in windows, as the process requires ImageMagick, and the shell script is therefore written for linux. So, from a linux machine, or possibly a cygwin prompt, change the directory to /resources/icons, and call the script 'creaticons.png.sh'.

If you're source is not stored in a place which is accessible to the linux machine, you will only need to copy the following folders over to such a machine in order to rebuild the icons:

  * vendor/famfam-silkicons/
  * resources/icons/