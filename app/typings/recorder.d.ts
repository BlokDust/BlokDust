declare var Recorder: {
    new(AudioSource: any, config?: any): Recorder;
};

interface Recorder {
    Start(): void;
    Stop(): void;
    Clear(): void;
    ExportStereo(callback?: any, type?: string)
    ExportMono(callback?: any, type?: string)
    Download(blob, filename?): void;
    GetBuffers(callback?: any)
    Configure(any): void;
}