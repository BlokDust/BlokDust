PixelPalette
============

This is a simple way to import a .gif palette to use in your Javascript/Canvas/HTML5 projects.

I made it for my own projects, to make colour managing much easier when using vectors,text & UI elements, and remove the need to deal with Hex codes/RGBA colour values.
Editing a colour palette mid-project is less of a chore, and it's particularly useful if you want to have unified colour adjustments across the whole palette (by applying colour/level adjustment layers to a screengrab of your project in Photoshop, then dragging those adjustments onto your palette .gif and re-saving it).
Each colour is a single pixel in the .gif. Currently it uses <a href="https://github.com/thinkpixellab/PxLoader">PxLoader</a> to handle the image preload.

###Load a palette:

    var pixelPalette = new PixelPalette("img/palette1.gif");

    pixelPalette.Load(function(palette) {
        // palette is an array of rgba values, e.g.
        // ["rgba(95, 39, 79, 1)", "rgba(223, 45, 79, 1)", "rgba(255, 157, 164, 1)", "rgba(69, 161, 147, 1)", "rgba(72, 193, 228, 1)", "rgba(255, 210, 102, 1)", "rgba(255, 255, 255, 1)"]
    });

This example loads a 7 colour palette, draws them onscreen and cycles through them in the background colour:

http://whitevinyl.github.io/PixelPalette/example/
