const ytdl = require('ytdl-core');
const fetch = require("node-fetch");
const FfmpegCommand  = require('fluent-ffmpeg');
const path = require('path');
const fs = require("fs");
const Jetty = require("jetty");

const input = require('./utils/input');

const formats = ["avi", "mp4", "mp3", "wav", "gif"];
const jetty = new Jetty(process.stdout);

FfmpegCommand.setFfmpegPath(path.join(__dirname, '/ffmpeg/bin/ffmpeg.exe'));
FfmpegCommand.setFfprobePath(path.join(__dirname, '/ffmpeg/bin/ffprobe.exe'));

(async () => {
    let url = await input("Youtube URL: ");
    let chosenFormat = await input("Pick format (mp3, mp4, avi, wav, gif): ");
    if (!formats.includes(chosenFormat)) return console.log("Invalid format.")
    let data = await ytdl.getInfo(url);
    let fileurl = data.formats[0].url;
    let format = data.formats[0].container;
    let time = data.length_seconds;
    let title = data.title;
    jetty.clear();
    jetty.rgb([5, 5, 0]);
    jetty.moveTo([0,0]);
    jetty.text("Fetching File...");
    fetch(fileurl)
        .then(res => {
            let stream = res.body;
            if (chosenFormat === format) {
                let writeStream = fs.createWriteStream(`${title}.${format}`);
                stream.pipe(writeStream);
                jetty.rgb([0, 5, 0]);
                jetty.moveTo([1,0]);
                jetty.text(`Saved to ${title}.${chosenFormat}`);
                jetty.rgb([5, 5, 5]);
                process.exit();
            }
            new FfmpegCommand(stream)
                .inputFormat(format)
                .outputFormat(chosenFormat)
                .output(`${title}.${chosenFormat}`)
                .on('start', function() {
                    jetty.clear();
                    jetty.rgb([5, 5, 0]);
                    jetty.moveTo([0,0]);
                    jetty.text("Converting 0%");
                })
                .on('error', function(err) {
                    jetty.clear();
                    jetty.rgb([5, 0, 0]);
                    jetty.moveTo([0,0]);
                    jetty.text(`Error: ${err.msg}`);
                })
                .on('progress', function(progress) {
                    let a = progress.timemark.split(".")[0].split(":");
                    let seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
                    let percent = Math.round((seconds/time)*100);
                    jetty.clear();
                    jetty.rgb([5, 5, 0]);
                    jetty.moveTo([0,0]);
                    jetty.text(`Converting ${percent}%`);
                })
                .on('end', function() {
                    jetty.rgb([0, 5, 0]);
                    jetty.moveTo([1,0]);
                    jetty.text(`Saved to ${title}.${chosenFormat}`);
                    jetty.rgb([5, 5, 5]);
                    process.exit();
                })
                .run()
        })
})()