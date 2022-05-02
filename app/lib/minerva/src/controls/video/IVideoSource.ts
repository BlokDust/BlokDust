module minerva.controls.video {
    export interface IVideoSource extends image.IImageSource {
        getIsPlaying(): boolean;
    }
}