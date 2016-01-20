export interface IL10n {
    Attribution: any;
    Blocks: IBlockType;
    Errors: IErrors;
}

interface IBlockType {
    Effect: IBlockGroup;
    Interaction: IBlockGroup;
    Power: IBlockGroup;
    Source: IBlockGroup;
}

interface IBlockGroup {
    Blocks: IBlockList;
    Label: string;
}

interface IBlockList {
    AutoWah: IBlockInfo;
    BitCrusher: IBlockInfo;
    Chomp: IBlockInfo;
    Chopper: IBlockInfo;
    Chorus: IBlockInfo;
    ComputerKeyboard: IBlockInfo;
    Convolution: IBlockInfo;
    Delay: IBlockInfo;
    Distortion: IBlockInfo;
    Envelope: IBlockInfo;
    Eq: IBlockInfo;
    Filter: IBlockInfo;
    Granular: IBlockInfo;
    Laser: IBlockInfo;
    LFO: IBlockInfo;
    Microphone: IBlockInfo;
    MIDIController: IBlockInfo;
    MomentaryPower: IBlockInfo;
    Noise: IBlockInfo;
    ParticleEmitter: IBlockInfo;
    Phaser: IBlockInfo;
    PitchShifter: IBlockInfo;
    Power: IBlockInfo;
    Recorder: IBlockInfo;
    Reverb: IBlockInfo;
    Sampler: IBlockInfo;
    Scuzz: IBlockInfo;
    Soundcloud: IBlockInfo;
    TogglePower: IBlockInfo;
    Tone: IBlockInfo;
    Void: IBlockInfo;
    Volume: IBlockInfo;
    WaveGen: IBlockInfo;
}

interface IBlockInfo {
    description: string;
    name: string;
}

interface IErrors {
    SaveError: string;
    SoundCloud: ISoundCloudErrors;
}

interface ISoundCloudErrors {
    FailedTrackFiltering: string;
    InternalServerError: string;
    ServiceUnavailable: string;
    TooManyRequests: string;
    Uninitialized: string;
    Unknown: string;
}