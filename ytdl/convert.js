const fetch = require("node-fetch");
const concat = require('concat-stream');
const music = require("music-api")
const NodeID3 = require('node-id3');

const { exec } = require('child_process');
const fs = require("fs");

const ffmpeg = require("./ffmpeg");

module.exports = async (event, options, win) => {
    let {selectedFormat, formatValue, fileType, metadata, time, filePath, videoTitle} = options;
    let {body} = await fetch(formatValue.url);

    let writeStream = fs.createWriteStream(filePath);
    writeStream.on('finish', function(){
        win.setProgressBar(-1)
        event.reply('download-complete', true);
        exec(`explorer.exe /select,"${filePath}"`);
    });

    let moreOptions = {body, win, event};

    if (fileType === formatValue.container) {
        win.setProgressBar(2);
        body.pipe(writeStream);
        event.reply('convert-percent', 100);
        event.reply('convert-complete', true);
    } else {
        if (!metadata) {
            moreOptions.output = writeStream;
            ffmpeg(options, moreOptions)
        } else {
            const writable = concat(opts = { encoding: "buffer" }, async function (buf) {
                let { songList } = await music.searchSong('netease', {
                    key: videoTitle.split(" (")[0],
                    limit: 1,
                    page: 1
                });
                if (songList.length === 0) {
                    event.reply('metadata-msg', "No metadata was found");
                    fs.writeFileSync(filePath, buf);
                    win.setProgressBar(-1);
                    event.reply('download-complete', true);
                    exec(`explorer.exe /select,"${filePath}"`);
                } else {
                    let image = await fetch(songList[0].album.coverBig);
                    image = await image.buffer();
                    let tags = {
                        title: songList[0].name,
                        artist: songList[0].artists.map(x => x.name).join(", "),
                        album: songList[0].album.name,
                        image
                    }
                    NodeID3.write(tags, buf, function (err, buffer) {
                        event.reply('metadata-msg', "Added metadata");
                        fs.writeFileSync(filePath, buffer);
                        win.setProgressBar(-1);
                        event.reply('download-complete', true);
                        exec(`explorer.exe /select,"${filePath}"`);
                    })
                }
            });
            moreOptions.output = writable;
            ffmpeg(options, moreOptions)
        }
    }
}