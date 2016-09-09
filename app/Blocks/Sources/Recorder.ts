import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {SamplerBase} from './SamplerBase';

declare var App: IApp;

export class Recorder extends SamplerBase {

    public Sources : Tone.Simpler[];
    public Recorder: any;
    //public PrimaryBuffer;
    public Filename: string;
    public IsRecording: boolean = false;
    public RecordedBlob;
    //private WaveForm: number[];
    public Params: SamplerParams;
    public Defaults: SamplerParams;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.Recorder.name;

        this.Defaults = {
            playbackRate: 0,
            detune: 0,
            reverse: false,
            startPosition: 0,
            endPosition: 0,
            loop: true,
            loopStart: 0,
            loopEnd: 0,
            volume: 20,
            track: null,
            trackName: '',
            permalink: ''
        };
        this.PopulateParams();

        this.WaveForm = [];

        super.init(drawTo);

        this.PrimaryBuffer = App.Audio.ctx.createBufferSource();

        this.Recorder = new RecorderJS(App.Audio.Master, {
            workerPath: App.Config.RecorderWorkerPath
        });

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
            e = this.Sources[i].envelope;
        });

        this.Sources.forEach((s: Tone.Simpler) => {
            s.connect(this.AudioInput);
            s.volume.value = this.Params.volume;
        });

        this.Filename = "BlokdustRecording.wav"; //TODO: make an input box for filename download

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(2, 1),new Point(1, 2));
    }

    update() {
        super.update();
    }

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
    }

    ToggleRecording(){
        if (this.IsRecording) {
            this.StopRecording();
        } else {
            this.StartRecording();
        }
    }

    StartRecording() {
        this.Recorder.clear();
        App.Message('Started Recording', {
            'seconds': 1,
        });
        this.IsRecording = true;
        this.Recorder.record();

        this.ReverseBuffer = null;
        this.Params.reverse = false;
    }

    StopRecording() {
        this.Recorder.stop();
        this.IsRecording = false;
        App.Message('Stopped Recording', {
            'seconds': 1,
        });
        this.SetBuffers();
    }

    SetBuffers() {

        this.Recorder.getBuffers((buffers) => {

            // if BufferSource doesn't exist create it
            if (!this.PrimaryBuffer) {
                this.PrimaryBuffer = App.Audio.ctx.createBufferSource();
            }
            // If we already have a BufferSource and the buffer is set, reset it to null and create a new one
            else if (this.PrimaryBuffer && this.PrimaryBuffer.buffer !== null){
                this.PrimaryBuffer = null;
                this.PrimaryBuffer = App.Audio.ctx.createBufferSource();
            }

            // TODO: add an overlay function which would merge new buffers with old buffers

            // Create a new buffer and set the buffers to the recorded data
            this.PrimaryBuffer.buffer = App.Audio.ctx.createBuffer(1, buffers[0].length, 44100);
            this.PrimaryBuffer.buffer.getChannelData(0).set(buffers[0]);
            this.PrimaryBuffer.buffer.getChannelData(0).set(buffers[1]);

            this.UpdateWaveform();

            // Set the buffers for each source
            this.Sources.forEach((s: Tone.Simpler)=> {
                s.player.buffer = this.PrimaryBuffer.buffer;
                s.player.loopStart = this.Params.loopStart;
                s.player.loopEnd = this.Params.loopEnd;
                //s.player.reverse = this.Params.reverse;
            });
            
            // start immediately if powered
            this.RetriggerActiveVoices();
        });
    }

    UpdateWaveform(){
        // Update waveform
        this.WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(this.PrimaryBuffer.buffer,200,2,95);
        var duration = this.GetDuration();
        this.Params.startPosition = 0;
        this.Params.endPosition = duration;
        this.Params.loopStart = duration * 0.5;
        this.Params.loopEnd = duration;

        this.RefreshOptionsPanel();
    }

    GetDuration(): number {
        if (this.PrimaryBuffer && this.PrimaryBuffer.buffer !== null){
            return this.PrimaryBuffer.buffer.duration;
        }  else {
            return 10;
        }
    }

    DownloadRecording() {
        this.Recorder.exportWAV((blob) => {
            console.log(`Downloading audio... Filename: ${this.Filename}, Size: ${blob.size} bytes`);
            this.Recorder.setupDownload(blob, this.Filename);
        });
    }

    Dispose(){
        super.Dispose();
        this.PrimaryBuffer = null;
        this.Recorder.clear();
        this.Recorder = null;
        this.RecordedBlob = null;
    }

    CreateSource(){
        this.Sources.push( new Tone.Simpler(this.PrimaryBuffer) );

        this.Sources.forEach((s: Tone.Simpler, i: number)=> {
            s.player.loop = this.Params.loop;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            //s.player.reverse = this.Params.reverse;
            s.volume.value = this.Params.volume;

            if (i > 0){
                s.player.buffer = this.Sources[0].player.buffer;
            }
        });

        if (this.Sources[this.Sources.length-1]){
            return this.Sources[this.Sources.length-1];
        }
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Recorder",
            "parameters" : [

                {
                    "type" : "waveregion",
                    "name" : "Recording",
                    "setting" :"region",
                    "props" : {
                        "value" : 5,
                        "min" : 0,
                        "max" : this.GetDuration(),
                        "quantised" : false,
                        "centered" : false,
                        "wavearray" : this.WaveForm,
                        "mode" : this.Params.loop,
                        "emptystring" : "No Sample"
                    },
                    "nodes": [
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
                        "min" : -App.Config.PlaybackRange,
                        "max" : App.Config.PlaybackRange,
                        "quantised" : false,
                        "centered" : true
                    }
                },
                {
                    "type" : "actionbutton",
                    "name" : "",
                    "setting" :"download",
                    "props" : {
                        "text" : "Download Recording"
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
                this.Params[param] = val;
                this.ReverseTrack();
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
                // update showing loop sliders
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
            case "download":
                if (this.PrimaryBuffer.buffer===null) {
                    App.Message("This block doesn't have a recording to download yet.");
                } else {
                    this.DownloadRecording();
                }
                break;
        }

        this.Params[param] = val;
    }

}
