/**
 * Created by luketwyman on 31/07/2015.
 */

class WaveVoice {

    public VoiceType: number;
    public WaveType: number;
    public Frequency: number;
    public Value: number;
    public Volume: number;
    public Polarity: number;
    public Drift: number;
    public Sequence: number[];
    public Slide: boolean;
    public FDest: number;

    constructor(type,wave, frequency,gain,drift,sequence,slide) {

        this.Frequency = frequency;
        this.Value = 0;
        this.Polarity = 1;
        this.VoiceType = type;
        this.WaveType = wave;
        this.Volume = gain;
        this.Drift = drift;
        this.Sequence = sequence;
        this.Slide = slide;
        this.FDest = frequency;

    }


}

export = WaveVoice;