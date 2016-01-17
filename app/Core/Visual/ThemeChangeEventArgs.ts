export class ThemeChangeEventArgs implements nullstone.IEventArgs {

    public Palette: any;

    constructor (palette: any) {
        Object.defineProperty(this, 'Palette', { value: palette, writable: false });
    }
}