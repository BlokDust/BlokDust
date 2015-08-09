import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import SamplerBase = require("./SamplerBase");

class RecorderBlock extends SamplerBase {

    public Sources : Tone.Simpler[];
    public Recorder: any;
    public BufferSource;
    public Filename: string;
    public IsRecording: boolean = false;
    public RecordedBlob;
    private _WaveForm: number[];
    public Params: SamplerParams;

    Init(sketch?: any): void {

        if (!this.Params) {
            this.Params = {
                playbackRate: 1,
                reverse: false,
                startPosition: 0,
                endPosition: 0,
                loop: true,
                loopStart: 0,
                loopEnd: 0,
                retrigger: false, //Don't retrigger attack if already playing
                volume: 0,
                track: null,
            };
        }

        this._WaveForm = [];

        super.Init(sketch);

        this.BufferSource = App.Audio.ctx.createBufferSource();

        this.Recorder = new Recorder(App.Audio.Master, {
            workerPath: App.Config.RecorderWorkerPath
        });

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
            e = this.Sources[i].envelope;
        });

        this.Sources.forEach((s: Tone.Simpler) => {
            s.connect(this.EffectsChainInput);
            s.volume.value = this.Params.volume;
        });

        this.Filename = "BlokdustRecording.wav"; //TODO: make an input box for filename download

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(2, 1),new Point(1, 2));
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"recorder");
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
            if (!this.BufferSource) {
                this.BufferSource = App.Audio.ctx.createBufferSource();
            }
            // If we already have a BufferSource and the buffer is set, reset it to null and create a new one
            else if (this.BufferSource && this.BufferSource.buffer !== null){
                this.BufferSource = null;
                this.BufferSource = App.Audio.ctx.createBufferSource();
            }

            // TODO: add an overlay function which would merge new buffers with old buffers

            // Create a new buffer and set the buffers to the recorded data
            this.BufferSource.buffer = App.Audio.ctx.createBuffer(1, buffers[0].length, 44100);
            this.BufferSource.buffer.getChannelData(0).set(buffers[0]);
            this.BufferSource.buffer.getChannelData(0).set(buffers[1]);

            this.UpdateWaveform();

            // Set the buffers for each source
            this.Sources.forEach((s: Tone.Simpler)=> {
                s.player.buffer = this.BufferSource.buffer;
                s.player.loopStart = this.Params.loopStart;
                s.player.loopEnd = this.Params.loopEnd;
            });


        });
    }

    UpdateWaveform(){
        // Update waveform
        this._WaveForm = this.GetWaveformFromBuffer(this.BufferSource.buffer,200,2,95);
        var duration = this.GetDuration();
        this.Params.endPosition = duration;
        this.Params.loopStart = duration * 0.5;
        this.Params.loopEnd = duration;

        this.RefreshOptionsPanel();
    }

    GetDuration(): number {
        if (this.BufferSource && this.BufferSource.buffer !== null){
            return this.BufferSource.buffer.duration;
        }  else {
            return 10;
        }
    }

    GetRecordedBlob() {
        this.Recorder.exportWAV((blob) => {
            this.RecordedBlob = blob;
        });

        return this.RecordedBlob;
    }

    DownloadRecording() {
        this.Recorder.setupDownload(this.GetRecordedBlob(), this.Filename);
    }

    Dispose(){
        super.Dispose();
        this.BufferSource = null;
        this.Recorder.clear();
        this.Recorder = null;
        this.RecordedBlob = null;
        this.Sources.forEach((s: any)=> {
            s.dispose();
        });
    }

    CreateSource(){
        this.Sources.push( new Tone.Simpler(this.BufferSource) );

        this.Sources.forEach((s: Tone.Simpler, i: number)=> {
            s.player.loop = this.Params.loop;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            s.player.retrigger = this.Params.retrigger;
            s.player.reverse = this.Params.reverse;

            if (i > 0){
                s.player.buffer = this.Sources[0].player.buffer;
            }
        });

        return super.CreateSource();
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
                        "wavearray" : this._WaveForm,
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
                console.log("out: "+ value);
                this.Sources[0].player.reverse = value;
                // Update waveform
                this.Params[param] = val;
                this._WaveForm = this.GetWaveformFromBuffer(this.BufferSource.buffer,200,2,95);
                this.RefreshOptionsPanel();
                break;
            case "loop":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Simpler)=> {
                    s.player.loop = value;
                });
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
        }

        this.Params[param] = val;
    }

}

export = RecorderBlock;