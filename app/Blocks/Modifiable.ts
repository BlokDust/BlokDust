import App = require("../App");
import IEffect = require("./IEffect");
import IModifiable = require("./IModifiable");
import Block = require("./Block");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifiable extends Block implements IModifiable{


    public Effects: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();
    public OldEffects: ObservableCollection<IEffect>;
    public Source: any;
    public OutputGain: Tone.Signal;

    constructor(grid: Grid, position: Point) {
        super(grid, position);

        this.Effects.CollectionChanged.on(() => {
            this._OnEffectsChanged();
        }, this);
    }

    AddEffect(effect: IEffect) {
        this.Effects.Add(effect);
    }

    RemoveEffect(effect: IEffect) {
        this.Effects.Remove(effect);
    }

    Draw(){
        super.Draw();

        if (window.debug){
            // draw connections to effect
            var effects = this.Effects.ToArray();

            var grd = this.Grid.ScaledCellWidth.width; // this.Grid.Width / this.Grid.Divisor;

            for(var i = 0; i < effects.length; i++){
                var target: IEffect = effects[i];

                var myPos = this.Grid.ConvertGridUnitsToAbsolute(this.Position);
                myPos = this.Grid.ConvertBaseToTransformed(myPos);
                var targetPos = this.Grid.ConvertGridUnitsToAbsolute(target.Position);
                targetPos = this.Grid.ConvertBaseToTransformed(targetPos);

                var xDif = (targetPos.x - myPos.x) / grd;
                var yDif = (targetPos.y - myPos.y) / grd;

                this.Ctx.strokeStyle = App.Palette[3];// BLUE

                this.Ctx.beginPath();
                this.Ctx.moveTo(myPos.x, myPos.y);

                if (xDif > 0) { // RIGHT HALF

                    if (yDif < 0) { // UPPER

                        if (-yDif < xDif) {
                            this.Ctx.lineTo(Math.round(myPos.x + ((xDif - (-yDif))*grd)), Math.round(myPos.y));
                        }

                        if (-yDif > xDif) {
                            this.Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y - (((-yDif) - xDif)*grd)));
                        }

                    }

                    if (yDif > 0) { // LOWER

                        if (yDif < xDif) {
                            this.Ctx.lineTo(Math.round(myPos.x + ((xDif - yDif)*grd)), Math.round(myPos.y));
                        }

                        if (yDif > xDif) {
                            this.Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y + ((yDif - xDif)*grd)));
                        }
                    }
                }

                if (xDif < 0) { // LEFT HALF

                    if (yDif < 0) { // UPPER

                        if (yDif > xDif) {
                            this.Ctx.lineTo(Math.round(myPos.x - ((yDif - xDif)*grd)), Math.round(myPos.y));
                        }

                        if (yDif < xDif) {
                            this.Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y - ((xDif - yDif)*grd)));
                        }

                    }

                    if (yDif > 0) { // LOWER

                        if (yDif < -xDif) {
                            this.Ctx.lineTo(Math.round(myPos.x - (((-xDif) - yDif)*grd)), Math.round(myPos.y));
                        }

                        if (yDif > -xDif) {
                            this.Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y + ((yDif - (-xDif))*grd)));
                        }

                    }

                }

                this.Ctx.lineTo(targetPos.x, targetPos.y);
                this.Ctx.stroke();
            }
        }
    }

    /*
    * Validate that the block's effects still exist
    * @param {ObservableCollection<IEffect>} effects - Parent's full list of Effects.
    */

    //TODO: THIS MAY NOT BE NECESSARY
    public ValidateEffects(){
        for (var i = 0; i < this.Effects.Count; i++){
            var effect:IEffect = this.Effects.GetValueAt(i);

            if (!App.Effects.Contains(effect)){
                this.RemoveEffect(effect);
            }
        }
    }

    private _OnEffectsChanged() {

        // disconnect effects in old collection.
        if (this.OldEffects && this.OldEffects.Count){
            //var oldmods: IEffect[] = this.OldEffects.ToArray();

            //for (var k = 0; k < oldmods.length; k++) {
            //    var oldmod = oldmods[k];
            //
            //    this._DisconnectEffect(oldmod);
            //
            //}
        }

        // connect effect in new collection.
        var mods: IEffect[] = this.Effects.ToArray();

        var _effects = [];

        for (var i = 0; i < mods.length; i++) {
            var mod:IEffect = mods[i];


            //this._ConnectEffect(mod);
            //TODO: this may not be necessary

            if (mod.Component && mod.Component.Effect) {
                _effects.push(mod.Component);
            }
        }

        this._UpdateEffectsChain(_effects);

        this.OldEffects = new ObservableCollection<IEffect>();
        this.OldEffects.AddRange(this.Effects.ToArray());
    }

    //private _ConnectEffect(effect: IEffect ) {
    //    effect.Connect(this);
    //}

    //private _DisconnectEffect(effect: IEffect) {
    //    effect.Disconnect(this);
    //}

    private _UpdateEffectsChain(effects) {

        if (effects.length) {
            var start = effects[0].Modifiable.Source;
            var mono = new Tone.Mono();
            var end = effects[0].Modifiable.OutputGain;

            start.disconnect();

            start.connect(mono);
            mono.connect(effects[0].Effect);
            var currentUnit = effects[0].Effect;

            for (var i = 1; i < effects.length; i++) {
                var toUnit = effects[i].Effect;
                currentUnit.disconnect();
                currentUnit.connect(toUnit);
                currentUnit = toUnit;
            }
            effects[effects.length - 1].Effect.disconnect();
            effects[effects.length - 1].Effect.connect(end);
            end.connect(App.AudioMixer.Master);
        } else {
            this.Source.disconnect();
            this.Source.connect(this.OutputGain);
        }

    }

}

export = Modifiable;