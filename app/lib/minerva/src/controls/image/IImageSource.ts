module minerva.controls.image {
    export interface IImageSource {
        draw(ctx: CanvasRenderingContext2D);
        createPattern(ctx: CanvasRenderingContext2D);
        isEmpty: boolean;
        pixelWidth: number;
        pixelHeight: number;
    }
}