import IBlock = require("./Blocks/IBlock");

class SaveFile {
    public ZoomLevel: number;
    public DragOffset: Point;
    public Composition: IBlock[];
}

export = SaveFile;