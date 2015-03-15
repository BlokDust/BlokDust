import Grid = require("../../Grid");
import Source = require("../Source");
import Type = require("../BlockType");
import BlocksSketch = require("../../BlocksSketch");
import BlockType = Type.BlockType;

class Soundcloud extends Source {

    public PlaybackRate: number;
    public LoopStartPosition: number;
    public LoopEndPosition: number;
    public Envelope: Tone.AmplitudeEnvelope;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.BlockType = BlockType.Soundcloud;
        this.PlaybackRate = 1;

        var scId = "?client_id=7258ff07f16ddd167b55b8f9b9a3ed33";
        var tracks = ["24456532","25216773","5243666","84216161","51167662","172375224", "87679226"];
        var audioUrl = "https://api.soundcloud.com/tracks/" + tracks[6] + "/stream" + scId;
        var localUrl = '../Assets/ImpulseResponses/teufelsberg01.wav';

        this.Source = new Tone.Player(localUrl, function (sc) {
            sc.loop = true;
            console.log('buffer loaded');
        });

        this.LoopStartPosition = 0; // 0 is the beginning
        this.LoopEndPosition = -1; // -1 goes to the end of the track

        this.Source.loop = true;
        this.Source.loopEnd = this.LoopEndPosition;

        this.Envelope = new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        );

        this.Envelope.connect(this.EffectsChainInput);
        this.Source.connect(this.Envelope);

        super.Init(sketch);

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


        if (!this.IsPowered()) {
            this.Source.start((<Soundcloud>this).LoopStartPosition);
        }
        this.Envelope.triggerAttack();

    }

    TriggerRelease() {
        super.TriggerRelease();

        this.Envelope.triggerRelease();
        if(!this.IsPowered()){
            //this.Source.stop(this.Source.now() + this.Envelope.release);
            this.Source.stop(this.Envelope.release+this.Source.now());
            console.log(this);
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
                        "value" : this.GetValue("playbackRate"),
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

    SetPlaybackRate(rate,time) {
        super.SetPlaybackRate(rate,time);
        this.PlaybackRate = rate;
        this.Source.playbackRate = this.PlaybackRate; //TODO: when playback rate becomes a signal ramp using the glide
    }

    SetValue(param: string,value: any) {
        super.SetValue(param,value);

        if (param == "playbackRate") {
            this.PlaybackRate = value;
        }
    }

    GetValue(param: string){
        var val = super.GetValue(param);
        return val;
    }
}

export = Soundcloud;