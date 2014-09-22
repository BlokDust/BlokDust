/// <reference path="../Refs.ts" />

import IBlock = require("./IBlock");
import Block = require("./Block");
import IModifier = require("./IModifier");
import IModifiable = require("./IModifiable");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class Modifier extends Block implements IModifier {

    public Targets: ObservableCollection<IModifiable> = new ObservableCollection<IModifiable>();
    public CatchmentArea: number = 100;

    constructor(position:Point) {
        super(position);
    }

    Effect:Tone.LFO;

    // loop through Targets applying Effect
    Modify() {

        for (var i = 0; i < this.Targets.Count; i++){
            var target = this.Targets[i];
            target.Modify(this.Effect);
        }
    }

    Update() {
        super.Update();

        // modify targets
        var targets = this.Targets.ToArray();

        for(var i = 0; i < targets.length; i++){
            var target: IModifiable = targets[i];

            target.Modify(this.Effect);
        }
    }

    // modifier blocks are black squares
    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 40, 40);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "#BBB" : "#000";
        ctx.fill();

        if (window.debug){
            // draw lines to targets
            var targets = this.Targets.ToArray();

            for(var i = 0; i < targets.length; i++){
                var target: IModifiable = targets[i];

                ctx.beginPath();
                ctx.moveTo(this.Position.X, this.Position.Y);
                ctx.lineTo(target.Position.X, target.Position.Y);
                ctx.stroke();
            }
        }
    }
}

export = Modifier;