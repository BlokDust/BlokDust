import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import IEffect = require("./IEffect");
import Block = require("./Block");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifiable extends Block implements IModifiable{
    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();
    public OldModifiers: ObservableCollection<IModifier>;
    public Osc: Tone.Oscillator;
    public Noise: Tone.Noise;
    public Envelope: Tone.Envelope;
    public OutputGain: GainNode;
    public Params: ToneSettings;

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        this.Modifiers.CollectionChanged.Subscribe(() => {
            this._OnModifiersChanged();
        }, this);
    }

    AddModifier(modifier: IModifier) {
        this.Modifiers.Add(modifier);
    }

    RemoveModifier(modifier: IModifier) {
        this.Modifiers.Remove(modifier);
    }

    Draw(ctx:CanvasRenderingContext2D){
        super.Draw(ctx);

        if (window.debug){
            // draw connections to modifiers
            var modifiers = this.Modifiers.ToArray();

            for(var i = 0; i < modifiers.length; i++){
                var target: IModifier = modifiers[i];

                ctx.beginPath();
                ctx.moveTo(this.AbsPosition.X, this.AbsPosition.Y);
                ctx.lineTo(target.AbsPosition.X, target.AbsPosition.Y);
                ctx.stroke();
            }
        }
    }

    /*
    * Validate that the block's modifiers still exist
    * @param {ObservableCollection<IModifier>} modifiers - Parent's full list of Modifiers.
    */
    public ValidateModifiers(modifiers: ObservableCollection<IModifier>){
        for (var i = 0; i < this.Modifiers.Count; i++){
            var modifier:IModifier = this.Modifiers.GetValueAt(i);

            if (!modifiers.Contains(modifier)){
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

        for (var i = 0; i < mods.length; i++) {
            var mod: IModifier = mods[i];

            var effects = mod.Effects.ToArray();

            for (var j = 0; j < effects.length; j++){
                var effect: IEffect = effects[j];

                this._ConnectEffect(effect);
            }
        }

        this.OldModifiers = new ObservableCollection<IModifier>();
        this.OldModifiers.AddRange(this.Modifiers.ToArray());
    }

    private _ConnectEffect(effect: IEffect ) {
        effect.Connect(this);
    }

    private _DisconnectEffect(effect: IEffect) {
        effect.Disconnect();
    }

}

export = Modifiable;