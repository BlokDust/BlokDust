import Grid = require("../../Grid");
import Source = require("../Source");
import BlocksSketch = require("../../BlocksSketch");

class Soundcloud extends Source {

    public Sources : Tone.Sampler[];
    public PlaybackRate: number;
    public AudioUrl: string;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.PlaybackRate = 1;

        var localUrl = '../Assets/ImpulseResponses/teufelsberg01.wav';
        var scId = "?client_id=7258ff07f16ddd167b55b8f9b9a3ed33";
        var tracks = ["24456532","25216773","5243666","84216161","51167662","172375224", "87679226"];
        this.AudioUrl = "https://api.soundcloud.com/tracks/" + tracks[0] + "/stream" + scId;
        //this.AudioUrl = localUrl;

        super.Init(sketch);

        this.CreateSource();

        this.Sources.forEach((s: Tone.Sampler)=> {
            s.player.loop = true;
            s.player.loopStart = 0; // 0 is the beginning
            s.player.loopEnd = -1; // -1 goes to the end of the track
            s.player.retrigger = true;
            //s.player.reverse = true; //TODO: add reverse capability
        });

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
            e = this.Sources[i].envelope;
        });

        this.Sources.forEach((s: Tone.Sampler, i: number)=> {
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

    SetParam(param: string,value: any) {
        super.SetParam(param,value);

        if (param == "playbackRate") {
            this.SetPitch(value);
        }
    }

    GetParam(param: string){
        var val = super.GetParam(param);
        return val;
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