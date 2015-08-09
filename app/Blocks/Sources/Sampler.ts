import Grid = require("../../Grid");
import SamplerBase = require("./SamplerBase");
import BlocksSketch = require("../../BlocksSketch");
import SoundCloudAudio = require('../SoundCloudAudio');
import SoundCloudAudioType = require('../SoundCloudAudioType');
import SoundcloudTrack = require("../../UI/SoundcloudTrack");

class Sampler extends SamplerBase {

    public Sources : Tone.Simpler[];
    public Params: SamplerParams;
    private _WaveForm: number[];
    private _FirstRelease: boolean = true;
    private _FirstBuffer: any;

    Init(sketch?: any): void {

        if (!this.Params) {
            this.Params = {
                playbackRate: 1,
                reverse: false,
                startPosition: 0,
                endPosition: null,
                loop: true,
                loopStart: 0,
                loopEnd: 0,
                retrigger: false, //Don't retrigger attack if already playing
                volume: 11,
                track: '',
            };
        }

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    FileReaderInit() {
        // Check for the various File API support.
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            // Great success! All the File APIs are supported.
        } else {
            App.Message('The File APIs are not fully supported in this browser.')
        }

        document.getElementById('fileInput').innerHTML = '<input type="file" id="files" name="files[]" multiple />';


    }

    SetupDropZone() {
        var dropZone = document.getElementById('drop_zone');
        dropZone.addEventListener('dragover', this.HandleDragOver, false);
        dropZone.addEventListener('drop', this.HandleFileSelect, false);
    }

    HandleFileSelect(event) {
        event.stopPropagation();
        event.preventDefault();

        var files = event.dataTransfer.files; // FileList object.

        // files is a FileList of File objects. List some properties.
        for (var i = 0, f; f = files[i]; i++) {
            // Only process audio files.
            if (!f.type.match('audio.*')) { //TODO: check this
                continue;
            }
            //list all files
            console.log(f);

            var reader = new FileReader();
            reader.onerror = this.ErrorHandler;
            reader.onprogress = this.UpdateProgress;
            reader.onabort = function(e) {
                alert('File read cancelled');
            };

            // Closure to capture the file information.
            reader.onload = (function(theFile) {
                return function(e) {
                    // Render thumbnail.
                    console.log(e);
                    console.log(theFile); // create buffer from this
                };
            })(f);

            // Read in the image file as a data URL.
            reader.readAsDataURL(f);
        }
    }

    ErrorHandler(event) {
        switch(event.target.error.code) {
            case event.target.error.NOT_FOUND_ERR:
                alert('File Not Found!');
                break;
            case event.target.error.NOT_READABLE_ERR:
                alert('File is not readable');
                break;
            case event.target.error.ABORT_ERR:
                break; // noop
            default:
                alert('An error occurred reading this file.'); //TODO: App.Message
        }
    }

    UpdateProgress(event) {
        // evt is an ProgressEvent.
        if (event.lengthComputable) {
            var percentLoaded = Math.round((event.loaded / event.total) * 100);
            // Increase the progress bar length.
            if (percentLoaded < 100) {
                console.log(percentLoaded + '%');
            }
        }
    }

    HandleDragOver(event) {
        event.stopPropagation();
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.

        //TODO: DRAW THE BLOCK HERE
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"sampler");
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Sampler",
            "parameters" : [

                {
                    "type" : "waveregion",
                    "name" : "Region",
                    "setting" :"region",
                    "props" : {
                        "value" : 5,
                        "min" : 0,
                        "max" : this.GetDuration(this._FirstBuffer),
                        "quantised" : false,
                        "centered" : false,
                        "wavearray" : this._WaveForm,
                        "mode" : this.Params.loop
                    },"nodes": [
                    {
                        "setting": "startPosition",
                        "value": this.Params.startPosition
                    },

                    {
                        "setting": "endPosition",
                        "value": this.Params.endPosition
                    },

                    {
                        "setting": "loopStart",
                        "value": this.Params.loopStart
                    },

                    {
                        "setting": "loopEnd",
                        "value": this.Params.loopEnd
                    }
                ]
                },
                {
                    "type" : "sample",
                    "name" : "Sample",
                    "setting" :"sample",
                    "props" : {
                        "track" : this.Params.track
                    }
                },
                {
                    "type" : "switches",
                    "name" : "Loop",
                    "setting" :"loop",
                    "switches": [
                        {
                            "name": "Reverse",
                            "setting": "reverse",
                            "value": this.Params.reverse,
                            "lit" : true
                        },
                        {
                            "name": "Looping",
                            "setting": "loop",
                            "value": this.Params.loop,
                            "lit" : true
                        }
                    ]
                },
                {
                    "type" : "slider",
                    "name" : "playback",
                    "setting" :"playbackRate",
                    "props" : {
                        "value" : this.Params.playbackRate,
                        "min" : 0.125,
                        "max" : 8,
                        "quantised" : false,
                        "centered" : true,
                        "logarithmic": true
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: any) {
        super.SetParam(param,value);
        var val = value;

        switch(param) {
            case "playbackRate":
                this.Sources[0].player.playbackRate = value;
                break;
            case "reverse":
                value = value? true : false;

                this._FirstBuffer.reverse = value;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.buffer = this._FirstBuffer;
                });
                this.Params[param] = val;
                // Update waveform
                this._WaveForm = this.GetWaveformFromBuffer(this._FirstBuffer._buffer,200,5,95);
                this.RefreshOptionsPanel();
                break;
            case "loop":
                value = value? true : false;
                this.Sources[0].player.loop = value;
                // update display of loop sliders
                this.Params[param] = val;
                this.RefreshOptionsPanel();
                break;
            case "loopStart":
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loopStart = value;
                });
                break;
            case "loopEnd":
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loopEnd = value;
                });
                break;
        }

        this.Params[param] = value;
    }

    Dispose(){
        super.Dispose();
    }
}

export = Sampler;