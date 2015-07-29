import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import Particle = require("../../Particle");

class Microphone extends Source {

    public Volume: any;
    public Muted: boolean = false;
    private _FirstRelease: boolean = true;
    private _unmutedVolume: number = 1;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        if (!this.Params) {
            this.Params = {
                gain: 1,
                monitor: 1 //TODO: change to boolean when available
            };
        }

        super.Init(sketch);

        this.Volume = App.Audio.ctx.createGain();
        this.Volume.gain.value = this.Params.gain;

        //this.CreateSource();

        this.Volume.connect(this.EffectsChainInput);

        // moved to first mouse release //
        /*// Microphone should be muted and only unmuted when powered
        this.Mute();

        this.Sources.forEach((s: Tone.Microphone)=> {
            s.connect(this.Volume);
            s.start();
        });*/

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    /**
     *  Mute the output
     */
    Mute() {
        if (!this.Muted) {
            this._unmutedVolume = this.Volume.gain.value;
            this.Volume.gain.value = 0;
            this.Muted = true;
        }
    }

    /**
     *  Unmute the output. Will return the volume to it's value before
     *  the output was muted.
     */
    Unmute() {
        if (this.Muted) {
            this.Volume.gain.value = this._unmutedVolume;
            this.Muted = false;
        }
    }

    CreateSource(){
        this.Sources.push( new Tone.Microphone() );
        return super.CreateSource();
    }

    TriggerAttack(index?: number|string){
        this.Unmute();
    }

    TriggerRelease(index?: number|string){
        if (!this.IsPowered()) {
            this.Mute();
        }
    }

    TriggerAttackRelease(duration: number){
        this.Unmute();
        if (!duration) duration = App.Config.PulseLength;
        setTimeout(() => {
            this.Mute();
        }, this.Sources[0].toSeconds(duration)*1000);
    }

    MouseUp() {
        if (this._FirstRelease) {
            this.CreateSource();
            // Microphone should be muted and only unmuted when powered
            //this.Mute();

            this.Sources.forEach((s: Tone.Microphone)=> {
                s.connect(this.Volume);
                s.start();
            });
            this._FirstRelease = false;
        }

        super.MouseUp();
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Microphone",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Monitor",
                    "setting" :"monitor",
                    "props" : {
                        "value" : this.Params.monitor,
                        "min" : 0,
                        "max" : 1,
                        "quantised" : true
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: any) {

        var val = value;

        if (param == "monitor") {
            //TODO: setup monitoring toggle or mix slider
        }
        this.Params[""+param] = val;

        super.SetParam(param,value);
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"microphone");
    }

    Dispose() {
        super.Dispose();

        this.Sources.forEach((s: Tone.Microphone)=> {
            s.dispose();
        });
    }
}

export = Microphone;