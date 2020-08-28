const FfmpegCommand = require('fluent-ffmpeg');

const path = require("path");

FfmpegCommand.setFfmpegPath(path.join(__dirname, '../ffmpeg/bin/ffmpeg.exe'));
FfmpegCommand.setFfprobePath(path.join(__dirname, '../ffmpeg/bin/ffprobe.exe'));

module.exports = (options, moreOptions) => {
    let {selectedFormat, formatValue, fileType, metadata, time, filePath} = options;
    let {body, win, output, event} = moreOptions;
    new FfmpegCommand(body)
    .inputFormat(formatValue.container)
    .outputFormat(fileType)
    .output(output)
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