echo [Windows] Building
mkdir builds
VERSION="$(node ./getVersion.js)"
electron-packager . Jellyfish --exclude=docs --app-version "$VERSION" --protocol=jellyfish-lsef --platform win32 --out ./builds --overwrite --icon ./www/assets/icon-win.ico --asar --app-copyright "(c) 2020 theLMGN - Do not redistribute. Provided with NO warranty" --app-bundle-id com.thelmgn.jellyfish --darwin-dark-mode-support
cp ./JellyDriver-SynapseX.exe builds/Jellyfish-win32-x64/
cp ./sxlib.dll builds/Jellyfish-win32-x64/
cp ./JellyInjector-SirHurt.exe builds/Jellyfish-win32-x64/

