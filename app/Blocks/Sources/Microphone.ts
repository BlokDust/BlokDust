import {IApp} from '../../IApp';
import {IAudioChain} from '../../Core/Audio/Connections/IAudioChain';
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {Source} from '../Source';

declare var App: IApp;

export class Microphone extends Source {

    public Volume: any; //TODO: This should be of type GainNode. Need to extend some web audio typings for tone
    public Params: MicrophoneParams;
    public Defaults: MicrophoneParams;
    public Muted: boolean = false;
    private _unmutedVolume: number = 1;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.Microphone.name;

        this.Defaults = {
            gain: 1,
            monitor: true
        };
        this.PopulateParams();

        super.init(drawTo);

        if (!(<any>navigator).getUserMedia) {
            App.Message(`Unfortunately the microphone will not work in this browser because it doesn't support 'getUserMedia'. Try using the latest Chrome`);
        }

        this.CreateSource();
        this.CreateFirstVoice();
        this.Volume = App.Audio.ctx.createGain();

        this.Sources.forEach((s: Tone.Microphone) => {
            s.open(() => {
                s.connect(this.Volume);
                s.start();
            });
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

    UpdateConnections(chain: IAudioChain) {
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

    TriggerAttackRelease(duration: Tone.Time){
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

    update() {
        super.update();
    }

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
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
