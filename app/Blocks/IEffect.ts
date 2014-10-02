import IModifier = require("./IModifier");

interface IEffect extends IModifier{
    Effects: Fayde.Collections.ObservableCollection<Tone>;

    input?: AudioNode;
    output?: AudioNode;
    params: Object;

}

export = IEffect;




/*

SourceBlocks --> Generates Sound

    Output: connects to EffectBlock.input || Master (default if not in range)

    Types:
        Tone
             Params: Object --> AudioNode || Tone
                Volume
                    isModifiableByModifier: boolean
                    Default
                    Min
                    Max
                Pitch
                    isModifiableByModifier: boolean
                    Default
                    Min
                    Max
                Waveform
                    isModifiableByModifier: boolean
                    Default
                    Options: Array --> (if no min & max then only step choices in options array
                        [sine, saw, square, triangle]

        Noise
             Params: Object --> AudioNode || Tone
                Volume
                    isModifiableByModifier: boolean
                    Default
                    Min
                    Max
                Waveform
                    isModifiableByModifier: boolean
                    Default
                    Options: Array --> (if no min & max then only step choices in options array
                        [pink, brown, white]

        PreFab
             Params: Object --> AudioNode || Tone
                Volume
                    isModifiableByModifier: boolean
                    Default
                    Min
                    Max
                PrefabSpecific??


ModifierBlocks --> Modifies a parameter from a Source or an Effect (which ever is closest)

    Input: connects to SourceBlock.ModifiableAttribute || EffectBlock.ModifiableAttribute

    Types:
        LFO
             Params
                Frequency
                    isModifiableByModifier: boolean
                    Default
                    Min
                    Max
                Depth
                    isModifiableByModifier: boolean
                    Default
                    Min
                    Max
                Waveform
                    isModifiableByModifier: boolean
                    Default
                    Options: Array --> (if no min & max then only step choices in options array
                    [sine, triangle, square, saw]

        Envelope
            Params
                Attack
                    Default
                    Min
                    Max
                Decay
                    Default
                    Min
                    Max
                Sustain
                    Default
                    Min
                    Max
                Release
                    Default
                    Min
                    Max


EffectBlocks --> Effects A Sources Output

    Input: connects to SourceBlockOutput || EffectBlockOutput
    Output: connects to MasterOutput:default || EffectBlockOutput

    Types:
        Delay
            Params
                Feedback
                    isModifiableByModifier: boolean
                    Default
                    Min
                    Max
                Time
                    isModifiable... etc

                WetLevel

        Distortion

        Phaser

        Chorus





 */