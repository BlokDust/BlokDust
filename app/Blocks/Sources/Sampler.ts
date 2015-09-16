import Grid = require("../../Grid");
import SamplerBase = require("./SamplerBase");
import MainScene = require("../../MainScene");
import Audio = require('../../Core/Audio/Audio');

import IApp = require("../../IApp");

declare var App: IApp;

class Sampler extends SamplerBase {

    public Sources : Tone.Simpler[];
    public Params: SamplerParams;
    private _WaveForm: number[];
    private _FirstRelease: boolean = true;
    private _FirstBuffer: Tone.Buffer;
    private _LoadFromShare: boolean = false;
    private _fileInput: HTMLElement = document.getElementById('audioFileInput');

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
                trackName: '',
            };
        } else {
            this._LoadFromShare = true;
            setTimeout(() => {
                this.FirstSetup();
            }, 100);
        }

        this._WaveForm = [];

        super.Init(sketch);

        this.FileReaderInit();

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    FirstSetup() {
        if (this._FirstRelease) {

            this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
                e = this.Sources[i].envelope;
            });

            this.Sources.forEach((s: Tone.Simpler) => {
                s.connect(this.AudioInput);
            });


            this.FileReaderInit();

            //TODO: this should be called when someone presses upload new audio file button
            this.HandleFileUploadButtonClick();

            this._FirstRelease = false;
        }
    }

    FileReaderInit() {
        // Check for the various File API support.
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            // Great success! All the File APIs are supported.
        } else {
            App.Message('The File APIs are not fully supported in this browser.')
        }

        this._fileInput.addEventListener('change', this.HandleFileUploadButton.bind(this), false);
    }

    /**
     * Upload file button
     * Because the input is hidden from view, we need to dispatch the input's event
     * to open the file choice dialog
     */
    HandleFileUploadButtonClick() {
        var event = document.createEvent('HTMLEvents');
        event.initEvent('click', true, false);
        this._fileInput.dispatchEvent(event);
    }

    HandleFileUploadButton(e) {
        var files = e.target.files; // FileList object
        App.Audio.AudioFileManager.DecodeFileData(files, (file: any, buffer: AudioBuffer) => {
            if (buffer) {
                this.SetBuffers(buffer);
                this.Params.trackName = files[0].name;
            }
        });
    }

    SetBuffers(buffer: AudioBuffer) {
        // STOP SOUND //
        this.Sources.forEach((s: any)=> {
            s.triggerRelease();
        });

        // LOAD FIRST BUFFER //
        App.AnimationsLayer.AddToList(this); // load animations
        if (this._FirstBuffer) { // cancel previous loads
            this._FirstBuffer.dispose();
        }

        this._FirstBuffer = new Tone.Buffer();
        this._FirstBuffer.buffer = buffer;

        this._WaveForm = this.GetWaveformFromBuffer(buffer,200,5,95);
        App.AnimationsLayer.RemoveFromList(this);
        var duration = this.GetDuration(this._FirstBuffer);
        if (!this._LoadFromShare) {
            this.Params.startPosition = 0;
            this.Params.endPosition = duration;
            this.Params.loopStart = duration * 0.5;
            this.Params.loopEnd = duration;
        }
        this._LoadFromShare = false;

        this.RefreshOptionsPanel();

        this.Sources.forEach((s: Tone.Simpler)=> {
            s.player.buffer = buffer;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
        });

        // IF PLAYING, RE-TRIGGER //
        if (this.IsPowered()) {
            this.TriggerAttack();
        }

        //TODO - onerror doesn't seem to work
        this._FirstBuffer.onerror = () => {
            console.error("Error loading audio file");
            App.Message('Error loading audio file');
        };
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"sampler");
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
                this.Sources[0].player.playbackRate.value = value;
                break;
            case "reverse":
                value = value? true : false;
                this.Sources[0].player.reverse = value;
                this.Params[param] = val;
                // Update waveform
                this._WaveForm = this.GetWaveformFromBuffer(this._FirstBuffer.buffer,200,5,95);
                this.RefreshOptionsPanel();
                break;
            case "loop":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loop = value;
                });
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
        this._fileInput.removeEventListener('change', this.HandleFileUploadButton, false);
    }
}

export = Sampler;