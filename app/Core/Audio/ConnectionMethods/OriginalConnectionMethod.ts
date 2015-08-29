import ConnectionMethodManager = require("./ConnectionMethodManager");
import IEffect = require("../../../Blocks/IEffect");
import ISource = require("../../../Blocks/ISource");
import PostEffect = require("../../../Blocks/Effects/PostEffect");
import AudioChain = require("./AudioChain");

class OriginalConnectionMethod extends ConnectionMethodManager {

    constructor(){
        super();
    }

    public Update() {
        super.Update();

        App.Sources.forEach((source: ISource) => {
            const start = source.AudioInput;

            const effects: IEffect[] = this.GetPostEffectsFromSource(source);

            if (effects.length) {

                if (this._Debug) console.log(source, ' disconnected.');
                start.disconnect();

                if (this._Debug) console.log(source, ' connect to: ', effects[0].Effect);
                start.connect(effects[0].Effect);
                let currentUnit = effects[0].Effect;

                for (let i = 1; i < effects.length; i++) {
                    const toUnit = effects[i].Effect;
                    if (this._Debug) console.log(currentUnit, ' disconnected.');
                    currentUnit.disconnect();
                    if (this._Debug) console.log(currentUnit, ' connect to: ', toUnit);
                    currentUnit.connect(toUnit);
                    currentUnit = toUnit;
                }
                if (this._Debug) console.log(effects[effects.length - 1].Effect, ' disconnected.');
                effects[effects.length - 1].Effect.disconnect();
                if (this._Debug) console.log(effects[effects.length - 1].Effect, ' to Master!');
                effects[effects.length - 1].Effect.toMaster();
            } else {
                if (this._Debug) console.log(source, ' disconnected.');
                start.disconnect();
                if (this._Debug) console.log(source, ' to Master!');
                start.toMaster();
            }
        });
    }

}

export = OriginalConnectionMethod;