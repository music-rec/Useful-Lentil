const { shell, remote, clipboard, ipcRenderer } = require('electron');
const { dialog, app } = remote;

const totalStages = 3;
const audioFormats = ["mp3", "wav"];
const videoFormats = ["mp4", "avi"]

var urlRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/g;

var selectedFormat = 0; // 0 = audio, 1 = video
var formatValue;
var fileType;
var metadata = false;
var time;
var stage = 0;
var youtube;


$(document).ready(() => {
    binds()
    stage_one()
});

let progress = (p = null) => {
    if (!p) {
        p = String((stage / totalStages) * 100) + "%";
    }
    $("#progress").css("width", `calc(${p} - 40px)`);
}

let binds = () => {
    // Remove all click events and rebind
    $("body").find("*").each(function() {
        $(this).off("click");
    });

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

    $("#progress-one").click(() => {
        stage = 0;
        stage_one()
    });

    $("#progress-two").click(() => {
        stage = 1;
        stage_two()
    });

    $("#progress-three").click(() => {
        stage = 2;
        stage_three()
    });

    let loop = setInterval(() => {
        let text = clipboard.readText();
        if (text && text.match(urlRegex) && text.match(urlRegex).length == 1) $("#search").val(text);
    }, 500);

    $("#search").focus(function(){
        clearInterval(loop)
    })

    $("#next").click(() => {
        youtube = $("#search").val();
        stage_two();
    })

    $(".file-format").click(e => {
        console.log("CLICKED")
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

let stage_one = () => {
    $(".stage").hide();
    $("#stageOne").show();
    stage = 0;
    progress();

    $(".progress-blob").hide();
    $("#progress-one").show();
}

let stage_two = async () => {
    stage = 1;
    progress()
    $(".stage").hide();
    $("#loadingStage").show();

    $(".progress-blob").hide();
    $("#progress-one").show();

    if (!youtube.match(urlRegex) || youtube.match(urlRegex).length > 1) {
        stage = 0;
        progress()
        stage_one()
    } else {
        ipcRenderer.send('get-formats', youtube);
        ipcRenderer.on('get-formats-reply', (_, formats) => {
            $("#loadingStage").hide();
            $("#stageTwo").show();
            let {audio, video, length_seconds} = formats;
            time = length_seconds;

            $("#video").unbind("click");
            $("#video").click(() => {
                selectedFormat = 1;
                formatValue = video;
                stage_three();
            })
            $("#audio").unbind("click");
            $("#audio").click(() => {
                selectedFormat = 0;
                formatValue = audio;
                stage_three(audio);
            })
        });
    }
}

let stage_three = () => {
    $(".stage").hide();
    $("#stageThree").show();
    stage = 2;
    progress();

    $(".progress-blob").hide();
    $("#progress-one").show();
    $("#progress-two").show();

    $("#file-formats").empty();
    $("#metadata-holder").empty();

    let formats = audioFormats;
    if (selectedFormat == 1) 
        formats = videoFormats;
    else
        $("#metadata-holder").html(`<input type="checkbox" id="metadata" name="metadata"><label for="metadata"> Add Metadata</label><br><br>`);

    for (let f of formats) {
        $("#file-formats").append(`<button id="${f}" class="file-format">${f}</button>`);
    }
    binds()
}

let stage_four = async () => {
    $(".stage").hide();
    let { canceled, filePath } = await dialog.showSaveDialog({
            defaultPath: `${app.getPath("downloads")}\\download.${fileType}`,
            filters: [{name: fileType.toUpperCase(), extensions: [fileType]}]
        });

    if (canceled) {
        return stage_three();
    }

    $(".stage").hide();
    $("#stageFour").show();

    $(".progress-blob").hide();
    
    ipcRenderer.send('convert', {selectedFormat, formatValue, fileType, metadata, time, filePath});
    ipcRenderer.on('convert-complete', () => {
        $("#status").text("Downloaded!");
        $("#restart").show();
        $(".progress-blob").show();
    })
    ipcRenderer.on('convert-error', (_, error) => {
        console.log(error)
    })
    ipcRenderer.on('convert-percent', (_, percent) => {
        let calc = String((percent / totalStages) + (((totalStages - 1) / totalStages) * 100)) + "%";
        progress(calc);
    })
}