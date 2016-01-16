export class ColorTheme {
    public Name: string;
    public PaletteURL: string;
    public Options: any;

    constructor(name: string, url: string, options?: any) {

        this.Name = name;
        this.PaletteURL = url;
        this.Options = options || {};

    }
}