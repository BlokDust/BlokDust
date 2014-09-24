import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import Block = require("./Block");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifiable extends Block implements IModifiable{
    public Modifiers: ObservableCollection<IModifier> = new ObservableCollection<IModifier>();

    constructor(position:Point) {
        super(position);
    }

    AddModifier(modifier: IModifier) {
        this.Modifiers.Add(modifier);
    }

    RemoveModifier(modifier: IModifier) {
        this.Modifiers.Remove(modifier);
    }

    Draw(ctx:CanvasRenderingContext2D){
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
}

export = Modifiable;