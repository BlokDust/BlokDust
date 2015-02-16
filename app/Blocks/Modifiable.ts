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

    /**
     * Add effect to this Source's list of effects
     * @param effect
     * @constructor
     */
    AddEffect(effect: IEffect) {
        this.Effects.Add(effect);
    }

    /**
     * Remove effect from this Source's list of effects
     * @param effect
     * @constructor
     */
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
    //public ValidateEffects(){
    //    for (var i = 0; i < this.Effects.Count; i++){
    //        var effect:IEffect = this.Effects.GetValueAt(i);
    //
    //        if (!App.Effects.Contains(effect)){
    //            this.RemoveEffect(effect);
    //        }
    //    }
    //}

    private _OnEffectsChanged() {

        // Detach effects in old collection.
        if (this.OldEffects && this.OldEffects.Count){
            var oldEffects: IEffect[] = this.OldEffects.ToArray();

            for (var k = 0; k < oldEffects.length; k++) {
                this._DetachEffect(oldEffects[k]);
            }
        }

        // List of connected effect blocks
        var effects: IEffect[] = this.Effects.ToArray();

        // List of PostEffect blocks
        var postEffects: IEffect[] = [];

        // For each connected effect
        for (var i = 0; i < effects.length; i++) {

            // Run Attach method for all effect blocks that need it
            this._AttachEffect(effects[i]);

            // If this is a post effect add to postEffect list
            if (effects[i].Effect) {
                postEffects.push(effects[i]);
            }
        }

        // Reorder the post effects chain
        this.UpdateEffectsChain(postEffects);

        // Update list of Old Effects
        this.OldEffects = new ObservableCollection<IEffect>();
        this.OldEffects.AddRange(this.Effects.ToArray());
    }

    /**
     * Runs attach method for all effect blocks that need a bespoke way of connecting (usually pre-effect blocks)
     * @param effect
     * @private
     */
    private _AttachEffect(effect: IEffect ) {
        effect.Attach(this);
    }

    /**
     * Runs detach method for all effect blocks that need a bespoke way of disconnecting (usually pre-effect blocks)
     * @param effect
     * @private
     */
    private _DetachEffect(effect: IEffect) {
        effect.Detach(this);
    }

    /**
     * Connects all this Source's post-effect blocks in series
     * @param effects
     * @public
     */
    public UpdateEffectsChain(effects) {

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
