
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require("fs")
const path = require("path")
const homedir = require('os').homedir();
const windows = require("os").platform() == "win32";
const child_process = require('child_process')
const fetch = require("node-fetch")
const http = require("http")
const url = require('url');
var httpListener = function(){}
try {
    /**
    http.createServer(function(req,res) {
        if (typeof httpListener == "function") {httpListener(req,res)}
    }).listen(7964)
    */
} catch(e) {
    console.error(e)
}


const JELLYFISH_DATA_DIR = path.join(homedir,"Documents","Jellyfish")
global.JELLYFISH_DATA_DIR = JELLYFISH_DATA_DIR

function createWindow () {
    global.exploit = require("./exploits/" + (windows ? "synx" : "calamari"))
    if (dialog.showMessageBoxSync({
        buttons: ["No","Yes"],
        defaultId: 1,
        message: "PLEASE READ",
        detail: "Jellyfish is only to be used on games that you have explicit permission to run a LSI on.\n\nAre you intending to use Jellyfish to inject into games you are not the owner of, or do not have permission from the owner to run a LSI on?",
    }) == 1) {
        return process.exit()
    }
    
    // Create the browser window.
    const win = new BrowserWindow({
        width: 768,
        height: 585,
        show:false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    })
    win.removeMenu()
    global.win = win
    
    ipcMain.on('inject-button-click',exploit.inject)
    ipcMain.on('check-creds',exploit.checkCreds)
    
    var tmin = 0
    ipcMain.on('set-topmost', (event,arg) => {
        win.setAlwaysOnTop(arg, "floating");
        win.setVisibleOnAllWorkspaces(arg);
        win.setFullScreenable(!arg);
    })
    ipcMain.on('run-script', async (event, arg) => {
        exploit.runScript(arg)
    })
    if (!fs.existsSync(JELLYFISH_DATA_DIR)) {
        fs.mkdirSync(JELLYFISH_DATA_DIR)
    }
    if (!fs.existsSync(path.join(JELLYFISH_DATA_DIR,"Scripts"))) {
        fs.mkdirSync(path.join(JELLYFISH_DATA_DIR,"Scripts"))
        exploit.downloadInitialScripts()
    }
    if (!fs.existsSync(path.join(JELLYFISH_DATA_DIR,"Config"))) {
        fs.mkdirSync(path.join(JELLYFISH_DATA_DIR,"Config"))
    }
    exploit.init()
    var key = ""
    
    function traverse(ckey,evt) {
        var scriptsDir = path.join(JELLYFISH_DATA_DIR,"Scripts")
        var walker = require("walker")(scriptsDir)
        walker.filterDir(() => {return key == ckey})
        walker.on("file", function(file,stat) {
            evt.reply('script-found',[key,scriptsDir,file])
        })
    }
    ipcMain.on("startCrawl",(evt,ckey) => {
        key = ckey
        traverse(key,evt)
    })
    
    // and load the index.html of the app.
    win.loadFile('www/index.html')
    win.webContents.on('new-window', function(event, url){
        event.preventDefault();
        child_process.spawn(process.platform == 'darwin'? 'open' : 'start', [url])
    });
    
    win.once('ready-to-show', () => {
        
        setTimeout(async function() {
            win.show()
            win.webContents.setZoomFactor(1);
            win.webContents.setVisualZoomLevelLimits(1, 1);
            httpListener = function(req,res) {
                var queryObject = url.parse(req.url,true).query;
                console.log(queryObject)
                win.webContents.send("http-request",queryObject)
            }
            try {
                var j = await (await fetch("https://api.github.com/repositories/273986462/releases")).json()
                var cv = require("./package.json").version
                var nv = j[0].tag_name
                console.log(j[0].tag_name,cv)
                if (cv != nv) {
                    console.log("diff vers")
                    
                    for (var a of j[0].assets) {
                        if (a.name.includes(process.platform)) {
                            var update = dialog.showMessageBoxSync(win,{
                                buttons: ["No","Yes"],
                                defaultId: 1,
                                message: "Not latest version",
                                detail: `The latest version of Jellyfish is ${nv}, you're running ${cv}, would you like to update now?\n\nChangelog:\n${j[0].body}`,
                            })
                            if (update) {
                                return child_process.spawn(process.platform == 'darwin'? 'open' : 'start', [j[0].assets[0].browser_download_url])
                            }
                        }
                    }
                }
            } catch(e) {
                console.error(e)
            }
            //win.webContents.setLayoutZoomLevelLimits(0, 0);
        },300)
    })
    
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
    app.quit()
})
