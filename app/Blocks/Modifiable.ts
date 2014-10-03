import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import Block = require("./Block");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifiable extends Block implements IModifiable{
    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();
    public OldModifiers: ObservableCollection<IModifier>;
    public ModifiableAttributes: any; //TODO: Change this any to type Object containing Audio Nodes

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        this.Modifiers.CollectionChanged.Subscribe(() => {
            this.OnModifiersChanged();
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
            // draw lines to targets
            var modifiers = this.Modifiers.ToArray();

            for(var i = 0; i < modifiers.length; i++){
                var target: IModifier = modifiers[i];

                ctx.beginPath();
                ctx.moveTo(this.Position.X, this.Position.Y);
                ctx.lineTo(target.Position.X, target.Position.Y);
                ctx.stroke();
            }
        }
    }

    OnModifiersChanged() {

        console.log("modifiers changed");

        if (this.OldModifiers && this.OldModifiers.Count){
            var oldmods: IModifier[] = this.OldModifiers.ToArray();

            for (var k = 0; k < oldmods.length; k++) {
                var oldmod = oldmods[k];

                var effects = oldmod.Effects.ToArray();

                for (var l = 0; l < effects.length; l++){
                    var effect = effects[l];

                    this.DisconnectEffect(effect);
                }
            }
        }

        // loop through modifier effects adding/removing to oscillator
        var mods: IModifier[] = this.Modifiers.ToArray();

        for (var i = 0; i < mods.length; i++) {
            var mod: IModifier = mods[i];

            var effects = mod.Effects.ToArray();

            for (var j = 0; j < effects.length; j++){
                var effect = effects[j];

                this.ConnectEffect(effect);
            }
        }

        this.OldModifiers = new ObservableCollection<IModifier>();
        this.OldModifiers.AddRange(this.Modifiers.ToArray());
    }

    ConnectEffect(effect: IEffect, ) {
        //console.log("connect effect");
        effect.Connect(this);
    }


    DisconnectEffect(effect: IEffect) {
        //console.log("disconnect effect");
        effect.Disconnect(this);
    }

}

export = Modifiable;