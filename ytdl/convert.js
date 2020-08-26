const fetch = require("node-fetch");
const FfmpegCommand = require('fluent-ffmpeg');
const path = require("path");
const fs = require("fs");
const { exec } = require('child_process');

FfmpegCommand.setFfmpegPath(path.join(__dirname, '../ffmpeg/bin/ffmpeg.exe'));
FfmpegCommand.setFfprobePath(path.join(__dirname, '../ffmpeg/bin/ffprobe.exe'));

module.exports = async (event, options, win) => {
    let {selectedFormat, formatValue, fileType, metadata, time, filePath} = options;
    let {body} = await fetch(formatValue.url);

    let writeStream = fs.createWriteStream(filePath);
    writeStream.on('finish', function(){
        win.setProgressBar(-1)
        event.reply('download-complete', true);
        exec(`explorer.exe /select,"${filePath}"`);
    });

    if (fileType === formatValue.container) {
        win.setProgressBar(2);
        body.pipe(writeStream);
        event.reply('convert-percent', 100);
        event.reply('convert-complete', true);
    } else {
        new FfmpegCommand(body)
            .inputFormat(formatValue.container)
            .outputFormat(fileType)
            .output(writeStream)
            .on('progress', function (progress) {
                let a = progress.timemark.split(".")[0].split(":");
                let seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
                let percent = Math.round((seconds / time) * 100);
                win.setProgressBar(percent / 100)
                event.reply('convert-percent', percent)
                if (!percent >= 99) {
                    win.setProgressBar(2)
                    event.reply('convert-complete', true);
                }
            })
            .on('error', function (err) {
                win.setProgressBar(-1)
                event.reply('convert-error', err)
            })
            .run()
    }
}