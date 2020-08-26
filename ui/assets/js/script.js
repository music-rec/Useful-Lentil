const { shell, remote, clipboard, ipcRenderer } = require('electron');
const { dialog, app } = remote;

var stage = 0;
var totalStages = 3;

var urlRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/g;

var selectedFormat = 0; // 0 = audio, 1 = video
var formatValue;
var fileType;
var metadata = false;
var time;


$(document).ready(() => {
    $("#close").click(() => {
        let w = remote.getCurrentWindow();
        w.close();
    })
    $("#minimise").click(() => {
        let w = remote.getCurrentWindow();
        w.minimize();
    })
    $(document).on('click', 'a[href^="http"]', function(event) {
        event.preventDefault();
        shell.openExternal(this.href);
    });

    stage_one()
});

let progress = (p = null) => {
    let increaseStage = false;
    if (!p) {
        p = String((stage / totalStages) * 100) + "%";
        increaseStage = true;
    }
    $("#progress").css("width", `calc(${p} - 40px)`);
    if (increaseStage) stage ++;
}

let stage_one = () => {
    $(".stage").hide();
    $("#stageOne").show();
    progress();

    let loop = setInterval(() => {
        let text = clipboard.readText();
        if (text && text.match(urlRegex) && text.match(urlRegex).length == 1) $("#search").val(text);
    }, 500);

    $("#search").focus(function(){
        clearInterval(loop)
    })

    $("#next").click(() => {
        if (stage == 1) stage_two($("#search").val());
    })
}

let stage_two = async (youtube) => {
    $(".stage").hide();
    if (!youtube.match(urlRegex) || youtube.match(urlRegex).length > 1) {
        stage -= 3;
        progress()
        stage_one()
    } else {
        ipcRenderer.send('get-formats', youtube);
        ipcRenderer.on('get-formats-reply', (_, formats) => {
            $("#stageTwo").show();
            progress();
            let {audio, video, length_seconds} = formats;
            time = length_seconds;

            $("#video").click(() => {
                selectedFormat = 1;
                formatValue = video;
                stage_three();
            })

            $("#audio").click(() => {
                formatValue = audio;
                stage_three(audio);
            })
        });
    }
}

let stage_three = () => {
    $(".stage").hide();
    $("#stageThree").show();
    progress();

    let formats = ["mp3", "wav"];
    if (selectedFormat == 1) 
        formats = ["mp4", "avi"];
    else
        $("#file-formats").after(`<input type="checkbox" id="metadata" name="metadata"><label for="metadata"> Add Metadata</label><br><br>`);

    for (let f of formats) {
        $("#file-formats").append(`<button id="${f}" class="file-format">${f}</button>`);
    }

    $(".file-format").click(e => {
        $(".file-format").removeClass("selected");
        $(e.target).closest('.file-format').addClass("selected");
    });

    $("#convert").click(() => {
        if ($(".selected").length  !== 1) return;
        fileType = $(".selected").attr('id');
        if (selectedFormat == 0) metadata = $('#metadata').is(":checked");
        stage_four()
    })
}

let stage_four = async () => {
    $(".stage").hide();
    let { canceled, filePath } = await dialog.showSaveDialog({
            defaultPath: `${app.getPath("downloads")}\\download.${fileType}`,
            filters: [{name: fileType.toUpperCase(), extensions: [fileType]}]
        });

    if (canceled) {
        stage = 2;
        return stage_three();
    }

    $(".stage").hide();
    $("#stageFour").show();
    
    ipcRenderer.send('convert', {selectedFormat, formatValue, fileType, metadata, time, filePath});
    ipcRenderer.on('convert-complete', () => {
        $("#status").text("Downloaded!");
        $(".hidden").show();
        $(".hidden").click(() => {
            location.reload();
        });
    })
    ipcRenderer.on('convert-error', (_, error) => {
        console.log(error)
    })
    ipcRenderer.on('convert-percent', (_, percent) => {
        let calc = String((percent / totalStages) + (((totalStages - 1) / totalStages) * 100)) + "%";
        progress(calc);
    })
}