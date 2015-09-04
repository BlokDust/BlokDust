import Effect = require("../Effect");
import PowerEffect = require("./PowerEffect");
import ISource = require("../ISource");
import MainScene = require("../../MainScene");
import AudioChain = require("../../Core/Audio/ConnectionMethods/AudioChain");

class Power extends PowerEffect {

    Init(sketch?: any): void {
        super.Init(sketch);

        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));

    }

    UpdateConnections(chain: AudioChain) {
        super.UpdateConnections(chain);

        chain.Sources.forEach((source: ISource) => {
            if (!source.IsPressed){
                source.TriggerRelease('all');
            }
            source.TriggerAttack();
        });
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"power");
    }

    Dispose(){
        super.Dispose();
    }
}

export = Power;