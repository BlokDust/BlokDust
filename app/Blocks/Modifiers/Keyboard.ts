import KeyboardComponent = require("../AudioEffectComponents/QwertyKeyboard");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");

class Keyboard extends Modifier {


    constructor(ctx:CanvasRenderingContext2D, point: Point){
        super(ctx, point);

        var effect = new KeyboardComponent();

        this.Effects.Add(effect);

    }

    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.rect(this.Position.X - this.Radius, this.Position.Y - this.Radius, 50, 30);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "rgb(121, 191, 184)" : "rgb(128, 192, 184)";
        ctx.fill();
    }

}

export = Keyboard;
