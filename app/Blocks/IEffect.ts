import IModifier = require("./IModifier");

interface IEffect extends IModifier{
    Effects: Fayde.Collections.ObservableCollection<Tone>;

    input?: AudioNode;
    output?: AudioNode;
    params: Object;

}

export = IEffect;



// OUTPUT --> Effect Input --> Any other effect Input || Master

// LFO connects to ModifiableAttributes
// Envelope connects to ModifiableAttributes
// Delay connects to Block Output

/*

SourceBlocks --> Generates Sound
    Tone
    Noise

ModifierBlocks
    Input: connects to SourceBlock.ModifiableAttribute || EffectBlock.ModifiableAttribute

    Types:
        LFO
        Envelope


EffectBlocks --> Connect from output of a SourceBlock to MasterOut
    Input: connects to SourceBlockOutput || EffectBlockOutput
    Output: connects to MasterOutput || EffectBlockOutput
    Types:
        Delay
        Distortion
        Phaser
        Chorus





 */