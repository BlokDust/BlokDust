/**
 * Created by luketwyman on 09/08/2015.
 */

import ColorTheme = require("./ColorTheme");

class ColorThemes {

    public Themes: ColorTheme[];

    constructor() {
        this.Themes = [
            new ColorTheme(
                "Default",
                App.Config.PixelPaletteImagePath[0]
            ),
            new ColorTheme(
                "Theme2",
                App.Config.PixelPaletteImagePath[1]
            ),
            new ColorTheme(
                "Theme3",
                App.Config.PixelPaletteImagePath[2]
            )
        ]
    }

}

export = ColorThemes;