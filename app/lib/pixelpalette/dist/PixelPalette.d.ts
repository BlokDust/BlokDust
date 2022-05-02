declare class PixelPalette {
    private imgPath;
    constructor(imgPath: string);
    Load(cb: (palette: any[]) => void): void;
}
export = PixelPalette;
