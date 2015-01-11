import App = require("../App");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import IEffect = require("./IEffect");
import Block = require("./Block");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifiable extends Block implements IModifiable{


    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();
    public OldModifiers: ObservableCollection<IModifier>;
    public Source: any;
    public OutputGain: Tone.Signal;

    constructor(grid: Grid, position: Point) {
        super(grid, position);

        this.Modifiers.CollectionChanged.on(() => {
            this._OnModifiersChanged();
        }, this);
    }

    AddModifier(modifier: IModifier) {
        this.Modifiers.Add(modifier);
    }

    RemoveModifier(modifier: IModifier) {
        this.Modifiers.Remove(modifier);
    }

    Draw(){
        super.Draw();

        if (window.debug){
            // draw connections to modifiers
            var modifiers = this.Modifiers.ToArray();

            var grd = this.Grid.Ctx.canvas.width / this.Grid.Divisor;

            for(var i = 0; i < modifiers.length; i++){
                var target: IModifier = modifiers[i];

                var myX = this.Position.x;
                var myY = this.Position.y;
                var toX = target.Position.x;
                var toY = target.Position.y;

                var xDif = (target.Position.x - this.Position.x) / grd;
                var yDif = (target.Position.y - this.Position.y) / grd;

                this.Ctx.strokeStyle = App.Palette[3];// BLUE

                this.Ctx.beginPath();
                this.Ctx.moveTo(myX, myY);

                if (xDif > 0) { // RIGHT HALF

                    if (yDif < 0) { // UPPER

                        if (-yDif < xDif) {
                            this.Ctx.lineTo(myX + ((xDif - (-yDif))*grd), myY);
                        }

                        if (-yDif > xDif) {
                            this.Ctx.lineTo(myX, myY - (((-yDif) - xDif)*grd));
                        }

                    }

                    if (yDif > 0) { // LOWER

                        if (yDif < xDif) {
                            this.Ctx.lineTo(myX + ((xDif - yDif)*grd), myY);
                        }

                        if (yDif > xDif) {
                            this.Ctx.lineTo(myX, myY + ((yDif - xDif)*grd));
                        }
                    }
                }

                if (xDif < 0) { // LEFT HALF

                    if (yDif < 0) { // UPPER

                        if (yDif > xDif) {
                            this.Ctx.lineTo(myX - ((yDif - xDif)*grd), myY);
                        }

                        if (yDif < xDif) {
                            this.Ctx.lineTo(myX, myY - ((xDif - yDif)*grd));
                        }

                    }

                    if (yDif > 0) { // LOWER

                        if (yDif < -xDif) {
                            this.Ctx.lineTo(myX - (((-xDif) - yDif)*grd), myY);
                        }

                        if (yDif > -xDif) {
                            this.Ctx.lineTo(myX, myY + ((yDif - (-xDif))*grd));
                        }

                    }

                }

                this.Ctx.lineTo(toX, toY);
                this.Ctx.stroke();
            }
        }
    }

    /*
    * Validate that the block's modifiers still exist
    * @param {ObservableCollection<IModifier>} modifiers - Parent's full list of Modifiers.
    */
    public ValidateModifiers(){
        for (var i = 0; i < this.Modifiers.Count; i++){
            var modifier:IModifier = this.Modifiers.GetValueAt(i);

            if (!App.Modifiers.Contains(modifier)){
                this.RemoveModifier(modifier);
            }
        }
    }

    private _OnModifiersChanged() {

        // disconnect modifiers in old collection.
        if (this.OldModifiers && this.OldModifiers.Count){
            var oldmods: IModifier[] = this.OldModifiers.ToArray();

            for (var k = 0; k < oldmods.length; k++) {
                var oldmod = oldmods[k];

                var effects = oldmod.Effects.ToArray();

                for (var l = 0; l < effects.length; l++){
                    var effect: IEffect = effects[l];

                    this._DisconnectEffect(effect);
                }
            }
        }

        // connect modifiers in new collection.
        var mods: IModifier[] = this.Modifiers.ToArray();

        var _effects = [];

        for (var i = 0; i < mods.length; i++) {
            var mod:IModifier = mods[i];

            var effects = mod.Effects.ToArray();

            for (var j = 0; j < effects.length; j++) {
                var effect:IEffect = effects[j];

                this._ConnectEffect(effect);
            }

            if (mod.Component.Effect) {
                _effects.push(mod.Component);
            }
        }

        this._UpdateEffectsChain(_effects);

        this.OldModifiers = new ObservableCollection<IModifier>();
        this.OldModifiers.AddRange(this.Modifiers.ToArray());
    }

    private _ConnectEffect(effect: IEffect ) {
        effect.Connect(this);
    }

    private _DisconnectEffect(effect: IEffect) {
        effect.Disconnect(this);
    }

    private _UpdateEffectsChain(effects) {

        if (effects.length) {
            var start = effects[0].Modifiable.Source;
            var end = effects[0].Modifiable.OutputGain;

            start.disconnect();
            start.connect(effects[0].Effect);
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