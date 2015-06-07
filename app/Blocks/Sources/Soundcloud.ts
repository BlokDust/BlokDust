import Grid = require("../../Grid");
import Source = require("../Source");
import BlocksSketch = require("../../BlocksSketch");

class Soundcloud extends Source {

    public Sources : Tone.Sampler[];
    public PlaybackRate: number;
    public AudioUrl: string;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.PlaybackRate = 1;

        if (!this.Params) {
            this.Params = {
                playbackRate: 1,
                reverse: 0, //TODO: Should be boolean,
                startPosition: 0,
                loop: 1,
                loopStart: 0,
                loopEnd: 0,
                retrigger: false, //Don't retrigger attack if already playing
                volume: 11
            };
        }

        var localUrl = '../Assets/ImpulseResponses/teufelsberg01.wav';
        var scId = "?client_id=7258ff07f16ddd167b55b8f9b9a3ed33";
        var tracks = ["24456532","25216773","5243666","84216161","51167662","172375224", "87679226"];
        this.AudioUrl = "https://api.soundcloud.com/tracks/" + tracks[0] + "/stream" + scId;
        //this.AudioUrl = localUrl;

        super.Init(sketch);

        this.CreateSource();

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
            e = this.Sources[i].envelope;
        });

        this.Sources.forEach((s: Tone.Sampler) => {
            s.connect(this.EffectsChainInput);
        });


        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    MouseDown() {
        super.MouseDown();
        this.TriggerAttack();
    }

    MouseUp() {
        super.MouseUp();
        this.TriggerRelease();
    }

    CreateSource(){
        this.Sources.push( new Tone.Sampler(this.AudioUrl) );
        this.Sources.forEach((s: Tone.Sampler)=> {
            s.player.startPosition = this.Params.startPosition;
            s.player.loop = this.Params.loop;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            s.player.retrigger = this.Params.retrigger;
            s.player.reverse = this.Params.reverse;
        });

        return super.CreateSource();
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"soundcloud");
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Soundcloud",
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
                    "name" : "Start Position",
                    "setting" :"startPosition",
                    "props" : {
                        "value" : this.Params.startPosition,
                        "min" : 0,
                        "max" : 10,//this.GetDuration(),
                        "quantised" : false,
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
                },
                {
                    "type" : "slider",
                    "name" : "Volume",
                    "setting" :"volume",
                    "props" : {
                        "value" : this.Params.volume,
                        "min" : 0,
                        "max" : 20,
                        "quantised" : false,
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
                this.Sources.forEach((s: Tone.Sampler)=> {
                    s.player.playbackRate = value;
                });
                break;
            case "reverse":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Sampler)=> {
                    s.player.reverse = value;
                });
                break;
            case "startPosition":
                this.Sources.forEach((s: Tone.Sampler)=> {
                    s.player.startPosition = value;
                });
                break;
            case "loop":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Sampler)=> {
                    s.player.loop = value;
                });
                break;
            case "loopStart":
                this.Sources.forEach((s: Tone.Sampler)=> {
                    s.player.loopStart = value;
                });
                break;
            case "loopEnd":
                this.Sources.forEach((s: Tone.Sampler)=> {
                    s.player.loopEnd = value;
                });
                break;
        }

        this.Params[param] = val;
    }

    GetDuration() {
        if (this.Sources[0] && this.Sources[0].player && this.Sources[0].player.buffer && this.Sources[0].player.buffer.duration){
            return this.Sources[0].player.buffer.duration;
        }
        return 0;
    }

    Dispose(){
        super.Dispose();

        this.Sources.forEach((s: Tone.Sampler) => {
            s.dispose();
        });

        this.Envelopes.forEach((e: Tone.Envelope) => {
            e.dispose();
        });

        this.PlaybackRate = null;
    }
}

export = Soundcloud;