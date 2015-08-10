/**
 * Created by luketwyman on 09/08/2015.
 */

class ColorTheme {
    public Name: string;
    public PaletteURL: string;
    public MenuOrder: number[];
    public OptionsOrder: number[];

    constructor(name: string, url: string, menuOrder?: number[], optionsOrder?: number[]) {

        this.Name = name;
        this.PaletteURL = url;
        this.MenuOrder = menuOrder;
        this.OptionsOrder = optionsOrder;

    }
}

export = ColorTheme;