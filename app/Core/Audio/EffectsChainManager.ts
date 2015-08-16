import IEffect = require("../../Blocks/IEffect");
import ISource = require("../../Blocks/ISource");
import Source = require("../../Blocks/Source")
import PostEffect = require("../../Blocks/Effects/PostEffect");

class EffectsChainManager {

    private DebugMode: boolean = true;

    constructor() {

    }

    /**
     * Updates the audio effects chain for all blocks
     * @public
     */
    public Update() {
        if (this.DebugMode) console.clear();

        this._disconnect();
        this._reconnect();
    }

    private _disconnect() {
        // Disconnect everything first!
        App.Sources.forEach((source: ISource) => {

            const effects: IEffect[] = this.GetPostEffectsFromSource(source);

            // This sources input gain
            const sourceInput: any = source.EffectsChainInput;

            // disconnect the input
            if (this.DebugMode) console.log((<any>source).__proto__, ' disconnected.');
            sourceInput.disconnect();

            // if this source has any post effects, disconnect those too
            if (effects.length) {

                effects.forEach((effect: IEffect) => {
                    if (this.DebugMode) console.log((<any>effect).__proto__, ' disconnected.');
                    effect.Effect.disconnect();
                });

            }

        });
    }

    private _reconnect() {
        //loop through all Sources in App.Sources
        App.Sources.forEach((source: ISource) => {

            const effects: IEffect[] = this.GetPostEffectsFromSource(source);

            if (this.DebugMode) console.warn('connect ', (<any>source).__proto__, ' to ', effects);

            // This sources input gain
            const sourceInput: any = source.EffectsChainInput;

            // if this source has any post effects
            if (effects.length) {

                // save current effect as the first effect in the loop
                let currentEffect = effects[0].Effect;

                // connect the input to it
                if (this.DebugMode) console.log((<any>source).__proto__, ' --> ', currentEffect.__proto__);
                sourceInput.connect(currentEffect);

                // if we any more effects loop through them
                for (let i = 1; i < effects.length; i++) {
                    // save the next effect in the loop
                    const nextEffect = effects[i].Effect;

                    if (this.DebugMode) console.log(currentEffect.__proto__, ' --> ', nextEffect.__proto__);
                    currentEffect.connect(nextEffect);

                    // the next effect becomes the current effect
                    currentEffect = nextEffect;
                }

                // connect the last effect to master
                //effects[effects.length - 1].Effect.connect(sourceOutput);
                if (this.DebugMode) console.log(effects[effects.length - 1].Effect.__proto__, ' --> Master!.');
                effects[effects.length - 1].Effect.toMaster();

            } else {
                // this source doesn't have post effects so just connect the source to the master
                if (this.DebugMode) console.log((<any>source).__proto__, ' --> Master!');
                sourceInput.toMaster();
            }

        });
    }

    public GetPostEffectsFromSource(source: ISource): IEffect[] {
        // List of connected effect blocks
        const effects:IEffect[] = source.Effects.ToArray();

        // List of PostEffect blocks
        const postEffects:IEffect[] = [];

        // For each connected effect
        for (let i = 0; i < effects.length; i++) {

            // If this is a post effect add to postEffect list
            if (effects[i] instanceof PostEffect) {
                //    if (effects[i].Effect) {
                postEffects.push(effects[i]);
            }
        }

        return postEffects;
    }

}

export = EffectsChainManager;