import IBlock = require("../../Blocks/IBlock");
import IEffect = require("../../Blocks/IEffect");
import ISource = require("../../Blocks/ISource");
import Source = require("../../Blocks/Source")
import PostEffect = require("../../Blocks/Effects/PostEffect");
import AudioChain = require("./AudioChain");
//import Group = require("./Group");

class EffectsChainManager {

    private DebugMode: boolean = true;
    private _oldEffects: IEffect[] = [];
    public Chains: AudioChain[] = [];

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

    ParseConnections(chain: AudioChain, parentBlock: IBlock){
        // if parentBlock isn't in audioChain
        if (!parentBlock.isIn(AudioChain)){
            // add parentBlock to audioChain
            chain.Connections.push(parentBlock);
            // set parentBlock.isChained = true
            parentBlock.IsChained = true;
            // forEach connected childbock (source / effect)
            parentBlock.Connections.forEach((childBlock) => {
                // ParseConnections(audioChain, childBlock)
                this.ParseConnections(chain, childBlock);
            });

        }

    }

    private _reconnect() {


        /**
         * Connections: IBlock
         * Connections: ISource / IEffect
         */

         // for each block
        App.Blocks.forEach((block) => {
            // if block isn't chained
            if (!block.isChained){
                //create audioChain, add to audioChains[]
                var chain: AudioChain = new AudioChain();
                this.Chains.push(chain);
                this.ParseConnections(chain, block)
            }
        });

        console.log(this.Chains);







        //var connectedSourceGroups = [];
        //var effectIdList = [];
        //var sourceDictionary = [];
        //
        //var groups: AudioChain[] = [];

        //App.Sources.forEach((source:ISource) => {
        //
        //    //var chain: AudioChain = new AudioChain;
        //
        //    // loop groups
        //    this.Chains.forEach((chain: AudioChain) => {
        //
        //        chain.Sources.forEach((sourceInChain: ISource) => {
        //            if (source.Id !== sourceInChain.Id) {
        //                var tempGroup: AudioChain = new AudioChain();
        //                tempGroup.Sources.push(source)
        //
        //            }
        //        });
        //
        //   });
        //
        //
        //
        //       var group: AudioChain = new AudioChain();
        //       group.Sources.push(source);
        //
        //
        //
        //});


        // loop effects
        //App.Effects.forEach((effect: IEffect) => {
        //    // only for post effects
        //    if (effect instanceof PostEffect) {
        //        // get it's sources
        //        const sources: ISource[] = effect.Sources.ToArray();
        //
        //        // if the sources are connected add to this array
        //        const connectedSourceGroup: ISource[] = [];
        //
        //        //FIXME dictionary is missing out some sources
        //        // always add source to connected source group unless it's already in the group
        //        sources.forEach((source) => {
        //            // if we haven't already add to a connectedSourceGroup
        //
        //            // if source.Id is not in the list
        //            //if (sourceDictionary.indexOf(source.Id) === -1){
        //                connectedSourceGroup.push(source);
        //                //sourceDictionary.push(source.Id);
        //            //}
        //        });
        //
        //        // if there's any sources in this group add them
        //        if (connectedSourceGroup.length){
        //            connectedSourceGroups.push(connectedSourceGroup);
        //        }
        //    }
        //});
        //
        //// We now have an array of connectedSources
        //console.log('connectedSourceGroups: ', connectedSourceGroups);
        //
        ////var chains = []; // list of effectChain
        //
        //
        //
        //var idList = [];
        //var chain: AudioChain = new AudioChain();
        ////  loop connectedSources
        //connectedSourceGroups.forEach((connectedSourceGroup:ISource[]) => {
        //
        //    //TODO: we may not need to loop over 'all' connectedSourceGroups. refine this
        //
        //    // loop sources in each connectedSourcesGroup
        //    connectedSourceGroup.forEach((source: ISource, i: number) => {
        //        //TODO: only concat uniques ID's instead of adding all
        //        // if source.ID is in the dictionary return
        //        // if effect.Id is in the dictionary return
        //        chain.Effects = chain.Effects.concat(source.Effects.ToArray());
        //        chain.Sources = chain.Sources.concat(source);
        //    });
        //
        //    //console.log(chain.Effects);
        //    //console.log(chain.Sources);
        //
        //
        //    // TODO: instead of removing duplicates - merge arrays
        //
        //    var e = chain.Effects.length;
        //    // loop in reverse so we can use splice
        //    while (e--) {
        //        let effect = chain.Effects[e];
        //        if (idList.indexOf(effect.Id) !== -1) {
        //            // effect is duplicate so remove it from effectsChain
        //            chain.Effects.splice(e, 1);
        //        } else {
        //            idList.push(effect.Id);
        //        }
        //    }
        //
        //    var s = chain.Sources.length;
        //    // loop in reverse so we can use splice
        //    while (s--) {
        //        let source = chain.Sources[s];
        //        if (idList.indexOf(source.Id) !== -1) {
        //            // effect is duplicate so remove it from effectsChain
        //            chain.Sources.splice(s, 1);
        //        } else {
        //            idList.push(source.Id);
        //        }
        //    }
        //
        //
        //    if (chain.Effects.length) {
        //        console.log(chain.Sources);
        //        console.log(chain.Effects);
        //        this.Chains.push(chain);
        //    }
        //
        //
        //});

        //TODO: create basic non-shared chains
        //TODO: connect up all our chains


        //console.log('chains ', chains);

        //  effectsChain is the list of all total effects
        //
        //  now connect them up
        //  and connect sources to the beginning of the chain!
        //
        //



        ////loop through all Sources in App.Sources
        //App.Sources.forEach((source: ISource) => {
        //
        //    const effects: IEffect[] = this.GetPostEffectsFromSource(source);
        //
        //    if (this.DebugMode) console.warn('connect ', (<any>source).__proto__, ' to ', effects);
        //
        //    // This sources input gain
        //    const sourceInput: any = source.EffectsChainInput;
        //
        //    // if this source has any post effects
        //    if (effects.length) {
        //
        //
        //
        //
        //
        //        /**
        //         *  if this effect is also in another sources list of effects (a shared effect)
        //         *  just plug into the beginning of that initial chain instead of creating a new chain
        //         *  WARNING: Without this method it is possible to get 'crossed connections'
        //         *  between effects which will cause an infinite audio loop and an ear-splitting
        //         *  bang which then breaks the browser's sound output. (it hurt with headphones!)
        //         *
        //         *  TODO: make this checker work
        //         *  if this effect is already in a chain
        //         *
        //         *  which chain is it?
        //         *
        //         *  connect this source to the beginning of that chain
        //         *
        //         *  but what about its effects that aren't shared?
        //         *  add those in before and then connect to beginning of other chain?
        //         *  or maybe the whole connection should be part of one chain?
        //         *
        //         *  In this example the chorus effect is shared by the tone and the noise
        //         *
        //         *  tone --> chorus, delay --> master!
        //         *  noise --> pitch, filter, chorus --> master!
        //         *
        //         *  in `CopyChainMode` it would actually connect like this:
        //         *
        //         *  tone --> pitch, filter, chorus, delay --> master
        //         *  noise --> pitch, filter, chrous, delay --> master
        //         *
        //         *
        //         *  in `SharedChainMode` it would depend on the order so could connect like this:
        //         *
        //         *  tone --> chorus, delay --> master!
        //         *  noise --> pitch, filter, chorus, delay --> master
        //         *
        //         *  or if noise was added first
        //         *
        //         *  noise --> pitch, filter, chorus --> master
        //         *  tone --> chorus, delay --> master
        //         *
        //         *
        //         *  Infinite loop example:
        //         *
        //         *  tone --> delay, chorus --> master
        //         *  noise --> chorus, delay --> master
        //         *      (This won't happen because we check for shared effects)
        //         *      if we have shared effects (in this case both the chorus & delay),
        //         *      and no unique effects just copy the tones connection chain.
        //         *
        //         *
        //         *  CHECKING FOR SHARED EFFECTS
        //         *
        //         *  Each source has a chain which is an array of connections
        //         *
        //         *  First, we loop through each source and save it's chain.
        //         *
        //         *  Then we check to see if any effects in this chain are also in another chain.
        //         *  ```
        //         *  loop all sources
        //         *      loop all effects
        //         *          in each effect check it's own list of sources
        //         *              if effect.Sources.length > 1
        //         *                  this effect is shared
        //         *                  this effect.shared = true;
        //         *
        //         *                  if copyChainMode
        //         *                      sharedEffects = []
        //         *                      effect.Sources.forEach(source){
        //         *                          sharedEffects.push(source.Effects)
        //         *                      }
        //         *                       effect.Sources.forEach(source){
        //         *                          source.connectChain(sharedEffects)
        //         *                      }
        //         *                   else sharedChainMode
        //         *                      ...
        //         *      end loop effects
        //         *
        //         *
        //         *      Each source creates a new chain
        //         *
        //         *      label each chain with an ID
        //         *
        //         *      for all chains
        //         *      if item in array i
        //         *
        //         *      USE array_intersect(source1.chain, source2.chain)
        //         *      this returns an array of shared effects
        //         *
        //         *      sharedEffects = array_intersect(source1.chain, source2.chain)
        //         *
        //         *      source1.connect(source1.uniqueEffects, sharedEffects)
        //         *      source2.connect(source2.uniqueEffects, sharedEffects)
        //         *
        //         *      or in copyConnectionMode:
        //         *
        //         *      source1.connect(source1.uniqueEffects, source2.uniqueEffects, sharedEffects)
        //         *      source2.connect(source1.uniqueEffects, source2.uniqueEffects, sharedEffects)
        //         *
        //         *
        //         *
        //         *      What if 3 sources share effects
        //         *      source1.connect(
        //         *
        //         *  ```
        //         */
        //
        //
        //
        //
        //        var hasSharedEffects = this._oldEffects.forEach((oldEffect) => {
        //            if ((<any>effects).includes(oldEffect)) {
        //                return true;
        //            }
        //        });
        //
        //        console.log(hasSharedEffects);
        //
        //
        //
        //
        //
        //
        //        // save current effect as the first effect in the loop
        //        let currentEffect = effects[0].Effect;
        //
        //        // connect the input to it
        //        if (this.DebugMode) console.log((<any>source).__proto__, ' --> ', currentEffect.__proto__);
        //        sourceInput.connect(currentEffect);
        //
        //        // if we any more effects loop through them
        //        for (let i = 1; i < effects.length; i++) {
        //            // save the next effect in the loop
        //            const nextEffect = effects[i].Effect;
        //
        //            if (this.DebugMode) console.log(currentEffect.__proto__, ' --> ', nextEffect.__proto__);
        //            currentEffect.connect(nextEffect);
        //
        //            // the next effect becomes the current effect
        //            currentEffect = nextEffect;
        //        }
        //
        //        // connect the last effect to master
        //        //effects[effects.length - 1].Effect.connect(sourceOutput);
        //        if (this.DebugMode) console.log(effects[effects.length - 1].Effect.__proto__, ' --> Master!.');
        //        effects[effects.length - 1].Effect.toMaster();
        //
        //    } else {
        //        // this source doesn't have post effects so just connect the source to the master
        //        if (this.DebugMode) console.log((<any>source).__proto__, ' --> Master!');
        //        sourceInput.toMaster();
        //    }
        //
        //    this._oldEffects = effects;
        //
        //});
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

    //removeFromList(s,c) {
    //
    //}

}

export = EffectsChainManager;