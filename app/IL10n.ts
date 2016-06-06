export interface IL10n {
    Attribution: any;
    UI: any;
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
    Distortion: IBlockInfo;
    Envelope: IBlockInfo;
    Eq: IBlockInfo;
    Filter: IBlockInfo;
    Granular: IBlockInfo;
    Laser: IBlockInfo;
    Microphone: IBlockInfo;
    MIDIController: IBlockInfo;
    Noise: IBlockInfo;
    ParticleEmitter: IBlockInfo;
    Phaser: IBlockInfo;
    PitchShifter: IBlockInfo;
    Power: IBlockInfo;
    PulsePower: IBlockInfo;
    Recorder: IBlockInfo;
    Reverb: IBlockInfo;
    Sample: IBlockInfo;
    SampleGen: IBlockInfo;
    Scuzz: IBlockInfo;
    StereoDelay: IBlockInfo;
    TogglePower: IBlockInfo;
    Tone: IBlockInfo;
    Vibrato: IBlockInfo;
    Void: IBlockInfo;
    Volume: IBlockInfo;
}

interface IBlockInfo {
    description: string;
    name: string;
}

interface IErrors {
    LoadError: string;
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

interface UI {
    CreateNew: ICreateNew;
    SharePanel: ISharePanel;
    Tutorial: ITutorial;
}

interface ICreateNew {
    Verify: string;
    NewMessage: string;
}

interface ISharePanel {
    SaveWarning: string;
    NoBlocks: string;
}

interface ITutorial {
    Scenes: ISceneItem[];
    SkipButton: string;
    DoneButton: string;
    TourComplete: string;
    Splash1: ISplash;
    Splash2: ISplash;
}

interface ISceneItem {
    Intro: string;
    Task: string;
}

interface ISplash {
    Message: string;
    Y: string;
    N: string;
}