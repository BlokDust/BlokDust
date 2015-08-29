import ConnectionMethodManager = require("./ConnectionMethodManager");
import IEffect = require("../../../Blocks/IEffect");
import ISource = require("../../../Blocks/ISource");
import PostEffect = require("../../../Blocks/Effects/PostEffect");
import AudioChain = require("./AudioChain");

class SimpleConnectionMethod extends ConnectionMethodManager {

    private _MuteBufferTime: number = 50;

    constructor(){
        super();
    }

    public Update() {
        super.Update();

        this._disconnect();
        this._reconnect();
    }



    private _disconnect() {
        //First mute everything
        App.Audio.Master.mute = true;


            // Disconnect everything first!
            App.Sources.forEach((source:ISource) => {

                const effects:IEffect[] = this.GetPostEffectsFromSource(source);

                // This sources input gain
                const sourceInput:Tone.Signal = source.AudioInput;

                // disconnect the input
                if (this._Debug) console.log((<any>source).__proto__, ' disconnected.');
                sourceInput.disconnect();

                // if this source has any post effects, disconnect those too
                if (effects.length) {

                    effects.forEach((effect:IEffect) => {
                        if (this._Debug) console.log((<any>effect).__proto__, ' disconnected.');
                        effect.Effect.disconnect();
                    });

                }

            });
            this._DisconnectionDone();

    }

    private _DisconnectionDone(){
        this._reconnect();
    }

    private _reconnect() {

        //loop through all Sources in App.Sources
        App.Sources.forEach((source: ISource) => {

            const effects: IEffect[] = this.GetPostEffectsFromSource(source);

            if (this._Debug) console.warn('connect ', (<any>source).__proto__, ' to ', effects);

            // This sources input gain
            const sourceInput: any = source.AudioInput;

            // if this source has any post effects
            if (effects.length) {

                // save current effect as the first effect in the loop
                let currentEffect = effects[0].Effect;

                // connect the input to it
                if (this._Debug) console.log((<any>source).__proto__, ' --> ', currentEffect.__proto__);
                sourceInput.connect(currentEffect);

                // if we any more effects loop through them
                for (let i = 1; i < effects.length; i++) {
                    // save the next effect in the loop
                    const nextEffect = effects[i].Effect;

                    if (this._Debug) console.log(currentEffect.__proto__, ' --> ', nextEffect.__proto__);
                    currentEffect.connect(nextEffect);

                    // the next effect becomes the current effect
                    currentEffect = nextEffect;
                }

                // connect the last effect to master
                if (this._Debug) console.log(effects[effects.length - 1].Effect.__proto__, ' --> Master!.');
                effects[effects.length - 1].Effect.toMaster();

            } else {
                // this source doesn't have post effects so just connect the source to the master
                if (this._Debug) console.log((<any>source).__proto__, ' --> Master!');
                sourceInput.toMaster();
            }

        });

        //// Lastly unmute everything
        //setTimeout(() => {
            App.Audio.Master.mute = false;
        //}, this._MuteBufferTime);
    }
}

export = SimpleConnectionMethod;