import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");

class RecorderBlock extends Source {

    public Sources : Tone.Sampler[];
    public Recorder: any;
    public BufferSource;
    public Filename: string;
    private _isRecording: boolean = false;
    public RecordedBlob;
    public PlaybackRate: number;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.PlaybackRate = 1;

        if (!this.Params) {
            this.Params = {
                playbackRate: 1,
                reverse: 0, //TODO: Should be boolean,
                loop: 1, //TODO: Should be boolean,
                loopStart: 0,
                loopEnd: 0,
                retrigger: false //Don't retrigger attack if already playing
            };
        }

        super.Init(sketch);

        this.CreateSource();
        this.BufferSource = App.AudioMixer.Master.context.createBufferSource();

        this.Recorder = new Recorder(App.AudioMixer.Master, {
            workerPath: App.Config.RecorderWorkerPath
        });

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
            e = this.Sources[i].envelope;
        });

        this.Sources.forEach((s: Tone.Sampler) => {
            s.connect(this.EffectsChainInput);
            s.volume.value = 10; //TODO: this is shit
        });

        this.Filename = "BlokdustRecording.wav"; //TODO: make an input box for filename download

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(2, 1),new Point(1, 2));


        //RECORD BUTTON TODO: make this a command in the command manager
        App.KeyboardInput.KeyDownChange.on(this.KeyDownCallback, this);
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"recorder");
    }

    MouseDown() {
        super.MouseDown();
        this.TriggerAttack();
    }

    MouseUp() {
        super.MouseUp();
        this.TriggerRelease();
    }

    KeyDownCallback(e){

        if ((<any>e).KeyDown === 'spacebar'){

            // Start recording on spacebar
            this.Sources.forEach((s: Tone.Sampler)=> {
                this.ToggleRecording();
            });
        }
    }

    ToggleRecording(){
        if (this._isRecording) {
            this.StopRecording();
        } else {
            this.StartRecording();
        }
    }

    StartRecording() {
        this.Recorder.clear();
        console.log('STARTED RECORDING...');
        this._isRecording = true;
        this.Recorder.record();
    }

    StopRecording() {
        this.Recorder.stop();
        this._isRecording = false;

        ////TODO: this may not be necceseary
        //this.Sources.forEach((s: any)=> {
        //    this.TriggerRelease();
        //});

        console.log('STOPPED RECORDING');
        this.SetBuffers();
    }

    StartPlayback() {
        this.Sources.forEach((s: any)=> {
            this.TriggerAttack();
        });

        console.log("STARTED PLAYBACK");
        console.log(this.GetRecordedBlob());
    }

    SetBuffers() {

        this.Recorder.getBuffers((buffers) => {

            this.BufferSource.buffer = this.Sources[0].context.createBuffer(1, buffers[0].length, 44100);
            this.BufferSource.buffer.getChannelData(0).set(buffers[0]);
            this.BufferSource.buffer.getChannelData(0).set(buffers[1]);

            this.Sources[0].player.buffer = this.BufferSource.buffer;

            this._OnBuffersReady();
        });
    }

    private _OnBuffersReady() {
        console.log("READY FOR PLAYBACK - CLICK, POWER OR CONNECT TO AN INTERACTION BLOCK")
    }

    StopPlayback() {
        this.Sources.forEach((s: any)=> {
            this.TriggerRelease();
        });
        console.log("STOPPED PLAYBACK");
    }

    GetRecordedBuffers() {
        return this.BufferSource.buffer;
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
        this.Recorder = null;
        this.RecordedBlob = null;

        this.Sources.forEach((s: any)=> {
            s.dispose();
        });

    }

    CreateSource(){
        this.Sources.push( new Tone.Sampler(this.BufferSource) );

        this.Sources.forEach((s: Tone.Sampler)=> {
            s.player.loop = this.Params.loop;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            s.player.retrigger = this.Params.retrigger;
            s.player.reverse = this.Params.reverse;
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
                    "type" : "slider",
                    "name" : "Playback rate",
                    "setting" :"playbackRate",
                    "props" : {
                        "value" : this.Params.playbackRate,
                        "min" : 0.125,
                        "max" : 8,
                        "quantised" : false,
                        "centered" : true,
                        "logarithmic": true
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Reverse",
                    "setting" :"reverse",
                    "props" : {
                        "value" : this.Params.reverse,
                        "min" : 0,
                        "max" : 1,
                        "quantised" : true,
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Loop",
                    "setting" :"loop",
                    "props" : {
                        "value" : this.Params.loop,
                        "min" : 0,
                        "max" : 1,
                        "quantised" : true,
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Loop Start",
                    "setting" :"loopStart",
                    "props" : {
                        "value" : this.Params.loopStart,
                        "min" : 0,
                        "max" : 10,//this.GetDuration(),
                        "quantised" : false,
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Loop End",
                    "setting" :"loopEnd",
                    "props" : {
                        "value" : this.Params.loopEnd,
                        "min" : 0.0001,
                        "max" : 10,//this.GetDuration(),
                        "quantised" : false,
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: any) {
        super.SetParam(param,value);
        var val = value;

        if (param === "playbackRate") {
            this.SetPitch(value);
        }
        if (param === "reverse") {
            value = value? true : false;
            this.Sources.forEach((s: Tone.Sampler)=> {
                s.player.reverse = value;
            });
        }

        if (param === "loop") {
            value = value? true : false;
            this.Sources.forEach((s: Tone.Sampler)=> {
                s.player.loop = value;
            });
        }

        if (param === "loopStart") {
            this.Sources.forEach((s: Tone.Sampler)=> {
                s.player.loopStart = value;
            });
        }

        if (param === "loopEnd") {
            this.Sources.forEach((s: Tone.Sampler)=> {
                s.player.loopEnd = value;
            });
        }

        this.Params[param] = val;
    }
}

export = RecorderBlock;