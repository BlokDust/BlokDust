import PreEffect = require("../PreEffect");
import ISource = require("../../ISource");
import Grid = require("../../../Grid");
import MainScene = require("../../../MainScene");
import AudioChain = require("../../../Core/Audio/ConnectionMethods/AudioChain");

class LFO extends PreEffect {

    public LFO: Tone.LFO;
    public Params: LFOParams;
    public Defaults: LFOParams;
    public WaveIndex: string[];

    Init(sketch?: any): void {

        this.Defaults = {
            rate: 2,
            depth: 20,
            waveform: 2
        };
        this.PopulateParams();

        this.WaveIndex = ["sine","square","triangle","sawtooth"];

        this.LFO = new Tone.LFO();
        this.LFO.frequency.value = this.Params.rate;
        this.LFO.min = -this.Params.depth;
        this.LFO.max = this.Params.depth;
        this.LFO.type = this.WaveIndex[this.Params.waveform];
        this.LFO.start();

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 2));
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"lfo");
    }

    UpdateConnections(chain: AudioChain) {
        super.UpdateConnections(chain);

        this.LFO.disconnect();

        chain.Sources.forEach((source: ISource) => {
            source.Sources.forEach((s: any) => {
                if ((<Tone.Oscillator>s).detune) {
                    this.LFO.connect((<Tone.Oscillator>s).detune);
                } else if ((<Tone.Simpler>s).player && (<Tone.Simpler>s).player.playbackRate) {
                    this.LFO.connect((<Tone.Simpler>s).player.playbackRate);
                }  else if ((<Tone.Noise>s).playbackRate) {
                    this.LFO.connect((<Tone.Noise>s).playbackRate);
                }
            });
        });
    }

    Dispose() {
        this.LFO.stop();
        this.LFO.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        if (param=="rate") {
            this.LFO.frequency.value = val;
        } else if (param=="depth") {
            this.LFO.min = -val;
            this.LFO.max = val;
        } else if (param=="waveform") {
            this.LFO.type = this.WaveIndex[val];
        }

        this.Params[param] = val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "LFO",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Rate",
                    "setting" :"rate",
                    "props" : {
                        "value" : this.Params.rate,
                        "min" : 0,
                        "max" : 20,
                        "quantised" : false,
                        "centered" : false
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Depth",
                    "setting" :"depth",
                    "props" : {
                        "value" : this.Params.depth,
                        "min" : 0,
                        "max" : 200,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "buttons",
                    "name" : "Wave",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.Params.waveform,
                        "mode" : "wave"
                    },
                    "buttons": [
                        {
                            "name" : "Sine"
                        },
                        {
                            "name" : "Square"
                        },
                        {
                            "name" : "Triangle"
                        },
                        {
                            "name" : "Saw"
                        }
                    ]
                }
            ]
        };
    }
}

export = LFO;