import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import Particle = require("../../Particle");

class Microphone extends Source {

    public Volume: any;
    private _unmutedVolume: number = 1;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        if (!this.Params) {
            this.Params = {
                gain: 1
            };
        }

        this.Volume = App.AudioMixer.Master.context.createGain();
        this.Volume.gain.value = this.Params.gain;

        this.CreateSource();

        this.Volume.connect(this.EffectsChainInput);

        // Microphone should be muted and only unmuted when powered
        this.Mute();

        this.Sources.forEach((s: Tone.Microphone)=> {
            s.connect(this.Volume);
            s.start();
        });

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    /**
     *  Mute the output
     */
    Mute() {
        this._unmutedVolume = this.Volume.gain.value;
        this.Volume.gain.value = 0;
    }

    /**
     *  Unmute the output. Will return the volume to it's value before
     *  the output was muted.
     */
    Unmute() {
        this.Volume.gain.value = this._unmutedVolume;
    }

    MouseDown() {
        super.MouseDown();
        this.Unmute();
    }

    MouseUp() {
        super.MouseUp();
        this.Mute();
    }

    CreateSource(){
        this.Sources.push( new Tone.Microphone() );
        return super.CreateSource();
    }

    TriggerAttack(index?: number|string){
        this.Unmute();
    }

    TriggerRelease(index?: number|string){
        this.Mute();
    }

    TriggerAttackRelease(duration: number){
        this.Unmute();
        setTimeout(() => {
            this.Mute();
        }, duration*1000);
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