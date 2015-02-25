import Grid = require("../../Grid");
import Source = require("../Source");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class Soundcloud extends Source {

    public PlaybackRate: number;
    public LoopStartPosition: number;
    public LoopEndPosition: number;

    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.Soundcloud;
        this.PlaybackRate = 1;

        var scId = "?client_id=7258ff07f16ddd167b55b8f9b9a3ed33";
        var tracks = ["24456532","25216773","5243666","84216161","51167662","172375224", "87679226"];
        var audioUrl = "https://api.soundcloud.com/tracks/" + tracks[6] + "/stream" + scId;
        var localUrl = '../Assets/ImpulseResponses/teufelsberg01.wav';

        this.Source = new Tone.Player(audioUrl, function (sc) {
            sc.loop = true;
            //sc.start();
            console.log('buffer loaded');
        });

        this.LoopStartPosition = 0; // 0 is the beginning
        this.LoopEndPosition = -1; // -1 goes to the end of the track

        this.Source.loop = true;
        this.Source.loopEnd = this.LoopEndPosition;


        /*var audioUrl;
         var id = '7258ff07f16ddd167b55b8f9b9a3ed33';
         SC.initialize({
         client_id: id
         });

         this.Source = new Tone.Player();
         var sc = this.Source;

         var rawUrl = "https://soundcloud.com/whitehawkmusic/deep-mutant";
         SC.get('/resolve', { url: rawUrl }, function(track) {
         audioUrl = ""+track.stream_url + "?client_id=" + id;
         console.log(audioUrl);
         sc.load(audioUrl, function (sc) {
         console.log(sc);
         sc.loop = true;
         sc.start();
         });
         });*/

        super(grid, position);

        this.Envelope = new Tone.AmplitudeEnvelope(this.Settings.envelope.attack, this.Settings.envelope.decay, this.Settings.envelope.sustain, this.Settings.envelope.release);
        this.Source.connect(this.Envelope);
        this.Envelope.connect(this.EffectsChainInput);


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
        this.Source.start(this.Source.toSeconds((<Soundcloud>this).LoopStartPosition));

    }

    TriggerRelease() {
        super.TriggerRelease();
        this.Source.stop(this.Source.toSeconds(this.Envelope.release));
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"soundcloud");
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
        this.Source.setPlaybackRate(rate,time);
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