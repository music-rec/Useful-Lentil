const ytdl = require('ytdl-core');
const fetch = require("node-fetch");
const FfmpegCommand = require('fluent-ffmpeg');
const music = require('music-api');
const NodeID3 = require('node-id3')
const Jetty = require("jetty");
const concat = require('concat-stream');

const path = require('path');
const fs = require("fs");

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
    jetty.moveTo([0, 0]);
    jetty.text("Fetching File...");
    fetch(fileurl)
        .then(res => {
            let stream = res.body;
            if (chosenFormat === format) {
                let writeStream = fs.createWriteStream(`${title}.${format}`);
                stream.pipe(writeStream);
                jetty.rgb([0, 5, 0]);
                jetty.moveTo([1, 0]);
                jetty.text(`Saved to ${title}.${chosenFormat}`);
                jetty.rgb([5, 5, 5]);
                process.exit();
            }
            if (chosenFormat !== "mp3") {
                new FfmpegCommand(stream)
                    .inputFormat(format)
                    .outputFormat(chosenFormat)
                    .output(`${title}.${chosenFormat}`)
                    .on('start', function () {
                        jetty.clear();
                        jetty.rgb([5, 5, 0]);
                        jetty.moveTo([0, 0]);
                        jetty.text("Converting 0%");
                    })
                    .on('error', function (err) {
                        jetty.clear();
                        jetty.rgb([5, 0, 0]);
                        jetty.moveTo([0, 0]);
                        jetty.text(`Error: ${err.msg}`);
                    })
                    .on('progress', function (progress) {
                        let a = progress.timemark.split(".")[0].split(":");
                        let seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
                        let percent = Math.round((seconds / time) * 100);
                        jetty.clear();
                        jetty.rgb([5, 5, 0]);
                        jetty.moveTo([0, 0]);
                        jetty.text(`Converting ${percent}%`);
                    })
                    .on('end', async function () {
                        jetty.rgb([0, 5, 0]);
                        jetty.moveTo([1, 0]);
                        jetty.text(`Saved to ${title}.${chosenFormat}`);
                        jetty.rgb([5, 5, 5]);
                        process.exit();
                    })
                    .run()
            } else {
                const writable = concat(opts = {
                    encoding: "buffer"
                }, async function (buf) {
                    jetty.clear();
                    jetty.rgb([0, 5, 0]);
                    jetty.moveTo([0, 0]);
                    jetty.text(`Converted successfully`);
                    jetty.moveTo([1, 0]);
                    jetty.text(`Finding metadata...`);
                    jetty.moveTo([2, 0]);
                    let { songList } = await music.searchSong('netease', {
                        key: title.split(" (")[0],
                        limit: 5,
                        page: 1
                    });
                    if (songList.length === 0) {
                        jetty.clear();
                        jetty.rgb([5, 0, 0]);
                        jetty.moveTo([0, 0]);
                        jetty.text(`No metadata found`);
                        fs.writeFileSync(`${title}.${chosenFormat}`, buf)
                        jetty.rgb([0, 5, 0]);
                        jetty.moveTo([1, 0]);
                        jetty.text(`Saved to ${title}.${chosenFormat}`);
                        jetty.rgb([5, 5, 5]);
                        process.exit();
                    }
                    let image = await fetch(songList[0].album.coverBig);
                    image = await image.buffer();
                    let tags = {
                        title: songList[0].name,
                        artist: songList[0].artists.map(x => x.name).join(", "),
                        album: songList[0].album.name,
                        image
                    }
                    NodeID3.write(tags, buf, function (err, buffer) {
                        jetty.clear();
                        jetty.rgb([0, 5, 0]);
                        jetty.moveTo([0, 0]);
                        jetty.text(`Added metadata`);
                        fs.writeFileSync(`${songList[0].name}.${chosenFormat}`, buffer)
                        jetty.moveTo([1, 0]);
                        jetty.text(`Saved to ${songList[0].name}.${chosenFormat}`);
                        jetty.rgb([5, 5, 5]);
                        process.exit();
                    })
                })
                new FfmpegCommand(stream)
                    .inputFormat(format)
                    .outputFormat(chosenFormat)
                    .output(writable)
                    .on('start', function () {
                        jetty.clear();
                        jetty.rgb([5, 5, 0]);
                        jetty.moveTo([0, 0]);
                        jetty.text("Converting 0%");
                    })
                    .on('error', function (err) {
                        jetty.clear();
                        jetty.rgb([5, 0, 0]);
                        jetty.moveTo([0, 0]);
                        jetty.text(`Error: ${err.msg}`);
                    })
                    .on('progress', function (progress) {
                        let a = progress.timemark.split(".")[0].split(":");
                        let seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
                        let percent = Math.round((seconds / time) * 100);
                        jetty.clear();
                        jetty.rgb([5, 5, 0]);
                        jetty.moveTo([0, 0]);
                        jetty.text(`Converting ${percent}%`);
                    })
                    .run()
            }
        })
})()