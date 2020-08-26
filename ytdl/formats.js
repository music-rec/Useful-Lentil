const ytdl = require('ytdl-core');

module.exports = async (youtube) => {
    let {videoDetails, formats} = await ytdl.getInfo(youtube);
    let {title, lengthSeconds} = videoDetails;
    let audio = ytdl.filterFormats(formats, "audioonly")[0];
    let video = ytdl.filterFormats(formats, "audioandvideo")[0];
    return {audio, video, lengthSeconds, title};
}