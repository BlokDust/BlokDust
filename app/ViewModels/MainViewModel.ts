/// <reference path="../refs" />

import Blocks = require("../Blocks");

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _Blocks: Blocks;
    private _Osc: Tone.Oscillator;

    constructor() {
        super();

        this._Blocks = new Blocks();

        this._Blocks.Collision.Subscribe(() => {
            this._Osc.start();
            setTimeout(
                () => {
                    this._Osc.stop();
                }
                , 100);
        }, this);

        this._Osc = new Tone.Oscillator(440, "sine");

        var vibrato = new Tone.LFO(6, -25, 25);
        vibrato.start();

        this._Osc.toMaster();
        this._Osc.setVolume(-10);
        vibrato.connect(this._Osc.detune);
    }

    Blocks_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){

        if (!this._Blocks.Ctx) this._Blocks.Ctx = e.args.SketchSession.Ctx;

        this._Blocks.Draw();
    }
}
export = MainViewModel;