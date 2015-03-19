import Grid = require("../../Grid");
import Source = require("../Source");
import BlocksSketch = require("../../BlocksSketch");

class Soundcloud extends Source {

    public Source : Tone.Sampler;
    public PlaybackRate: number;
    public Envelope: Tone.AmplitudeEnvelope;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.PlaybackRate = 1;

        var scId = "?client_id=7258ff07f16ddd167b55b8f9b9a3ed33";
        var tracks = ["24456532","25216773","5243666","84216161","51167662","172375224", "87679226"];
        var audioUrl = "https://api.soundcloud.com/tracks/" + tracks[6] + "/stream" + scId;
        var localUrl = '../Assets/ImpulseResponses/teufelsberg01.wav';

        this.Source = new Tone.Sampler(audioUrl);

        this.Source.player.loop = true;
        this.Source.player.loopStart = 0; // 0 is the beginning
        this.Source.player.loopEnd = -1; // -1 goes to the end of the track

        super.Init(sketch);

        this.Envelope = this.Source.envelope;
        this.Source.connect(this.EffectsChainInput);

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

    TriggerAttack() {
        super.TriggerAttack();

        if(!this.IsPowered() || this.Source.player.state === "stopped") {
            this.Source.triggerAttack();
        }
    }

    TriggerRelease() {
        super.TriggerRelease();

        if(!this.IsPowered()) {
            this.Source.triggerRelease();
        }
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"soundcloud");
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Soundcloud",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Playback rate",
                    "setting" :"playbackRate",
                    "props" : {
                        "value" : this.GetParam("playbackRate"),
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

    SetPlaybackRate(rate,time?) {
        super.SetPlaybackRate(rate,time);
        this.Source.player.playbackRate = rate; //TODO: when playback rate becomes a signal ramp using the glide
        this.PlaybackRate = rate;
    }

    SetParam(param: string,value: any) {
        super.SetParam(param,value);

        if (param == "playbackRate") {
            this.SetPlaybackRate(value);
        }
    }

    GetParam(param: string){
        var val = super.GetParam(param);
        return val;
    }

    Dispose(){
        super.Dispose();
        this.Source.dispose();
        this.PlaybackRate = null;
        this.Envelope = null;
    }
}

export = Soundcloud;