const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const formats = require("./ytdl/formats.js");
const convert = require("./ytdl/convert.js");

var win;

app.on("ready", () => {
    win = new BrowserWindow({
        width: 800,
        height: 300,
        resizable: false,
        backgroundColor: '#3D383D',
        webPreferences: {
          nodeIntegration: true,
          enableRemoteModule: true
        },
        frame: false,
        icon: path.join(__dirname, "/ui/assets/img/lentil.ico")
    });
    win.setMenuBarVisibility(false)

    win.loadFile("ui/index.html")
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

ipcMain.on('get-formats', async (event, youtube) => {
    let f = await formats(youtube);
    event.reply('get-formats-reply', f)
})

ipcMain.on('convert', module.exports = async (event, options) => {
    convert(event, options, win);
})