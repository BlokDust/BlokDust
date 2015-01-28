/**
 * Created by luketwyman on 26/01/2015.
 */

import App = require("./../App");
import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");


class MenuCategory {

    public Position: Point;
    public Size: Size;
    public Name: string;
    public Items: string[];
    public Selected: number;
    public Hover: boolean;

    constructor (position: Point, size: Size, name: string) {
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.Items = [];
        this.Selected = 0;
        this.Hover = false;
    }

}

export = MenuCategory;