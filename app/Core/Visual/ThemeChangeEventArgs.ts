export class ThemeChangeEventArgs implements nullstone.IEventArgs {

    public Index: number;
    public Palette: any;

    constructor (index: number, palette: any) {
        Object.defineProperty(this, 'Index', { value: index, writable: false });
        Object.defineProperty(this, 'Palette', { value: palette, writable: false });
    }
}