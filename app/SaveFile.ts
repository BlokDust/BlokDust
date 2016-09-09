import {IBlock} from './Blocks/IBlock';
import Point = etch.primitives.Point;

export class SaveFile {
    public ColorThemeNo: number;
    public Composition: IBlock[];
    public DragOffset: Point;
    public Parent: string;
    public ZoomLevel: number;
}