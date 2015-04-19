import IBlock = require("./Blocks/IBlock");

class SaveFile {
    public ZoomLevel: number;
    public ZoomPosition: Point;
    public Composition: IBlock[];
}

export = SaveFile;