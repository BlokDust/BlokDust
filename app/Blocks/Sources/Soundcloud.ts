import Grid = require("../../Grid");
import Source = require("../Source");
import BlocksSketch = require("../../BlocksSketch");
import SoundCloudAudio = require('../SoundCloudAudio');
import SoundCloudAudioType = require('../SoundCloudAudioType');

class Soundcloud extends Source {

    public Sources : Tone.Player[];

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        if (!this.Params) {
            this.Params = {
                playbackRate: 1,
                reverse: 0, //TODO: Should be boolean,
                startPosition: 0,
                loop: 1,
                loopStart: 0,
                loopEnd: 0,
                retrigger: false, //Don't retrigger attack if already playing
                volume: 11,
                track: ''
            };
        }

        const localUrl = '../Assets/ImpulseResponses/teufelsberg01.wav';
        this.Params.track = SoundCloudAudio.PickRandomTrack(SoundCloudAudioType.Soundcloud);
        this.Params.track = localUrl;

        super.Init(sketch);

        this.CreateSource();
        this.CreateEnvelope();

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
            e.connect(this.EffectsChainInput);
        });

        this.Sources.forEach((s: Tone.Player, i: number) => {
            s.connect(this.Envelopes[i]);
        });

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    CreateSource(){
        this.Sources.push( new Tone.Player(this.Params.track) );
        this.Sources.forEach((s: Tone.Player)=> {
            //s.startPosition = this.Params.startPosition;
            s.loop = this.Params.loop;
            s.loopStart = this.Params.loopStart;
            s.loopEnd = this.Params.loopEnd;
            s.retrigger = this.Params.retrigger;
            s.reverse = this.Params.reverse;
        });

        return super.CreateSource();
    }

    CreateEnvelope(){
        this.Envelopes.push( new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        ));

        return super.CreateEnvelope();
    }

    TriggerAttack(index: number|string = 0) {
        if (this.Sources[index].buffer.loaded){
            super.TriggerAttack(index);
            this.Sources[index].start(this.Sources[0].now(), this.Params.startPosition);
        }
    }

    TriggerRelease(index: number|string = 0) {  //TODO: add time parameter
        if (this.Sources[index].buffer.loaded && !this.IsPowered()) {
            super.TriggerRelease(index);
            //this.Sources[index].stop(this.Sources[0].now()); //FIXME: at the moment player dies if parameter is more than zero
            let time;
            let timeToSecs = this.Sources[0].toSeconds(time);
            let release = this.Sources[0].toSeconds(this.Envelopes[0].release)
            let added = timeToSecs + release;
            this.Sources[index].stop(added);
        }
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
                this.Sources[0].playbackRate = value;
                break;
            case "reverse":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Player)=> {
                    s.reverse = value;
                });
                break;
            //case "startPosition":
            //    this.Sources.forEach((s: Tone.Player)=> {
            //        s.startPosition = value;dfdsf
            //    });
            //    break;
            case "loop":
                value = value? true : false;
                this.Sources.forEach((s: Tone.Player)=> {
                    s.loop = value;
                });
                break;
            case "loopStart":
                this.Sources.forEach((s: Tone.Player)=> {
                    s.loopStart = value;
                });
                break;
            case "loopEnd":
                this.Sources.forEach((s: Tone.Player)=> {
                    s.loopEnd = value;
                });
                break;
        }

        this.Params[param] = val;
    }

    GetDuration() {
        if (this.Sources[0] && this.Sources[0].buffer && this.Sources[0].buffer.duration){
            return this.Sources[0].buffer.duration;
        }
        return 0;
    }

    Dispose(){
        super.Dispose();

        this.Sources.forEach((s: Tone.Player) => {
            s.dispose();
        });

        this.Envelopes.forEach((e: Tone.Envelope) => {
            e.dispose();
        });
    }
}

export = Soundcloud;