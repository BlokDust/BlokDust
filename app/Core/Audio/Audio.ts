class Audio {

    public Tone: Tone;
    public ctx: AudioContext;
    public sampleRate: number;
    public Master: Tone.Master;
    public MasterVolume: number = -10; // in decibels
    public NoteIndex: string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    constructor() {

        // Reference to Tone
        this.Tone = new Tone();

        // Reference to the web audio context
        this.ctx = this.Tone.context;

        this.sampleRate = this.ctx.sampleRate;

        // Master Output
        this.Master = Tone.Master;

        // Master Gain Level
        this.Master.volume.value = this.MasterVolume;

    }

    DecodeFileData(files, callback: (file: any, buffer: AudioBuffer) => any) {
        //Only process audio files.
        if (!files[0].type.match('audio.*')) {
            App.Message('This is not an audio file, please try again with a .wav, .mp3 or .ogg');
            return;
        }
        //Only process files of a certain length
        if (files[0].size > 100000000) {
            App.Message('The audio file is too large. The maximum size is 100mb');
        }

        var reader = new FileReader();
        reader.onerror = this.ErrorHandler;
        reader.onprogress = this.UpdateProgress;
        reader.onabort = function(e) {
            App.message('File read cancelled');
        };
        reader.onload = (ev:any) => {
            App.Audio.ctx.decodeAudioData(ev.target.result, (theBuffer) => {
                callback(files[0], theBuffer);
            }, function(){ //error function
                App.message('Sorry, we could not process this audio file.');
                console.error('Sorry, we could not process this audio file.');
                callback(files[0], undefined);
            });
        };
        reader.readAsArrayBuffer(files[0]);
    }

    ErrorHandler(event) {
        switch(event.target.error.code) {
            case event.target.error.NOT_FOUND_ERR:
                App.Message('File Not Found!');
                break;
            case event.target.error.NOT_READABLE_ERR:
                App.Message('File is not readable');
                break;
            case event.target.error.ABORT_ERR:
                break; // noop
            default:
                App.Message('An error occurred reading this file.');
        }
    }

    UpdateProgress(event) {
        // event is a ProgressEvent.
        if (event.lengthComputable) {
            var percentLoaded = Math.round((event.loaded / event.total) * 100);
            // Increase the progress bar length.
            if (percentLoaded < 100) {
                console.log(percentLoaded + '%');
            }
            console.log(percentLoaded + '%');
        }
    }
}

export = Audio;