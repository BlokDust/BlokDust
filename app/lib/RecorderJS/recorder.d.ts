declare var RecorderJS: {
    new(AudioSource: any, config?: any): RecorderJS;
};

interface RecorderJS {
    record(): void;
    stop(): void;
    clear(): void;
    exportWAV(callback?: any, type?: string);
    exportMonoWAV(callback?: any, type?: string);
    setupDownload(blob, filename?): void;
    getBuffer(callback?: any)
    configure(any): void;
}
