/// <reference path="../lib/fayde/Fayde.d.ts" />
/// <reference path="../lib/fayde.drawing/Fayde.Drawing.d.ts" />

import Clock = require("../Clock");

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _LondonClock: Clock;
    private _AucklandClock: Clock;

    public _LondonMeridian: string;
    public _AucklandMeridian: string;

    get LondonMeridian(): string {
        return this._LondonMeridian;
    }

    set LondonMeridian(value: string){
        this._LondonMeridian = value;
        this.OnPropertyChanged("LondonMeridian");
    }

    get AucklandMeridian(): string {
        return this._AucklandMeridian;
    }

    set AucklandMeridian(value: string){
        this._AucklandMeridian = value;
        this.OnPropertyChanged("AucklandMeridian");
    }

    constructor() {
        super();

        this._LondonClock = new Clock(0); // UTC
        this._AucklandClock = new Clock(11); // UTC + 11 hrs
    }

    LondonClock_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){

        if (!this._LondonClock.Ctx) this._LondonClock.Ctx = e.args.SketchSession.Ctx;

        this._LondonClock.Draw();

        this.LondonMeridian = this._GetMeridian(this._LondonClock.GetTime().Hour);
    }

    AucklandClock_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){

        if (!this._AucklandClock.Ctx) this._AucklandClock.Ctx = e.args.SketchSession.Ctx;

        this._AucklandClock.Draw();

        this.AucklandMeridian = this._GetMeridian(this._AucklandClock.GetTime().Hour);
    }

    _GetMeridian(hour: number): string {
        return (hour > 12) ? 'PM' : 'AM';
    }
}
export = MainViewModel;