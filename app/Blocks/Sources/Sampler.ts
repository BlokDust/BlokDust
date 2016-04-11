import {Audio} from '../../Core/Audio/Audio';
import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../MainScene';
import Point = etch.primitives.Point;
import {SamplerBase} from './SamplerBase';

declare var App: IApp;

export class Sampler extends SamplerBase {

    public Sources : Tone.Simpler[];
    public Params: SamplerParams;
    public Defaults: SamplerParams;
    private _WaveForm: number[];
    private _FirstRelease: boolean = true;
    private _FirstBuffer: any;
    private _LoadFromShare: boolean = false;
    private _fileInput: HTMLElement = document.getElementById('audioFileInput');

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.Sampler.name;

        if (this.Params) {
            this._LoadFromShare = true;
            setTimeout(() => {
                this.FirstSetup();
            }, 100);
        }

        this.Defaults = {
            playbackRate: 0,
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
            permalink: ''
        };
        this.PopulateParams();

        this._WaveForm = [];

        super.Init(drawTo);

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
            //this.HandleFileUploadButtonClick();

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
    //TODO: this gets called twice after the click gets called once.
    HandleFileUploadButton(e) {
        console.log("upload start");
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

        this._FirstBuffer = new Tone.Buffer(buffer, (e) => {

            App.AnimationsLayer.RemoveFromList(this);
            var duration = this.GetDuration(e._buffer);
            this.Params.startPosition = 0;
            this.Params.endPosition = duration;
            this.Params.loopStart = duration * 0.5;
            this.Params.loopEnd = duration;
            this.Params.reverse = false;


            this.Sources.forEach((s:Tone.Simpler)=> {
                s.player.buffer = e;
                s.player.loopStart = this.Params.loopStart;
                s.player.loopEnd = this.Params.loopEnd;
                s.player.reverse = this.Params.reverse;
            });

            this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(e._buffer, 200, 5, 95);
            this.RefreshOptionsPanel();

            // IF PLAYING, RE-TRIGGER //
            if (this.IsPowered()) {
                this.TriggerAttack();
            }


        });

        //TODO - onerror doesn't seem to work
        this._FirstBuffer.onerror = () => {
            console.error("Error loading audio file");
            App.Message('Error loading audio file');
        };
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
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
                        "max" : this.Params.endPosition,
                        "quantised" : false,
                        "centered" : false,
                        "wavearray" : this._WaveForm,
                        "mode" : this.Params.loop,
                        "emptystring" : "No Sample"
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
                    "type" : "samplelocal",
                    "name" : "Sample",
                    "setting" :"sample",
                    "props" : {
                        "track" : this.Params.trackName
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
                            "lit" : true,
                            "mode": "offOn"
                        },
                        {
                            "name": "Looping",
                            "setting": "loop",
                            "value": this.Params.loop,
                            "lit" : true,
                            "mode": "offOn"
                        }
                    ]
                },
                {
                    "type" : "slider",
                    "name" : "playback",
                    "setting" :"playbackRate",
                    "props" : {
                        "value" : this.Params.playbackRate,
                        "min" : -36,
                        "max" : 36,
                        "quantised" : false,
                        "centered" : true
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
                /*if ((<any>Tone).isSafari) {
                    this.Sources[0].player.playbackRate = value;
                } else {
                    this.Sources[0].player.playbackRate.value = value;
                }*/
                this.Params.playbackRate = value;
                this.NoteUpdate();
                break;
            case "reverse":
                value = value? true : false;
                this.Sources[0].player.reverse = value;
                this.Params[param] = val;
                // Update waveform
                this._WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(this._FirstBuffer._buffer,200,5,95);

                this.RefreshOptionsPanel();
                break;
            case "loop":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loop = value;
                });
                if (value === true && this.IsPowered()) {
                    this.Sources.forEach((s: Tone.Simpler) => {
                        s.player.stop();
                        s.player.start(s.player.startPosition);
                    });
                }
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
            case "sample":
                console.log("button called");
                this.HandleFileUploadButtonClick();
                break;
        }

        this.Params[param] = value;
    }

    Dispose(){
        super.Dispose();
        this._fileInput.removeEventListener('change', this.HandleFileUploadButton, false);
    }
}
