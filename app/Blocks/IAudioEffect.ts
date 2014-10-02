import IEffect = require("./IEffect");

interface IAudioEffect extends IModifier{
    Effects: Fayde.Collections.ObservableCollection<Tone>;
    isPreSource: boolean;

    input: Tone;
    output: Tone;
    params: Object;

}

export = IAudioEffect;


