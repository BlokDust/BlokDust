import Grid = require("../../Grid");
import MainScene = require("../../MainScene");
import Source = require("../Source");
import Particle = require("../../Particle");
import AudioChain = require("../../Core/Audio/Connections/AudioChain");

class Microphone extends Source {

    public Volume: any; //TODO: This should be of type GainNode. Need to extend some web audio typings for tone
    public Params: MicrophoneParams;
    public Muted: boolean = false;
    private _unmutedVolume: number = 1;

    Init(sketch?: any): void {
        if (!this.Params) {
            this.Params = {
                gain: 1,
                monitor: true,
            };
        }

        super.Init(sketch);

        this.CreateSource();
        this.Volume = App.Audio.ctx.createGain();

        this.Sources.forEach((s: Tone.Microphone)=> {
            s.connect(this.Volume);
            s.start();
        });

        this.Volume.gain.value = this.Params.gain;
        this.Volume.connect(this.AudioInput);

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

    CreateSource(): Tone.Microphone {
        this.Sources.push( new Tone.Microphone() );
        return this.Sources[this.Sources.length-1];
    }

    UpdateConnections(chain: AudioChain) {
        this.Chain = chain;

        // Release the microphones envelope
        if (!this.IsPressed) {
            this.TriggerRelease();
        }
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
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"microphone");
    }

    Dispose() {
        super.Dispose();

        this.Sources.forEach((s: Tone.Microphone)=> {
            s.dispose();
        });

        this.Volume = null;
        this.Muted = null;
    }
}

export = Microphone;