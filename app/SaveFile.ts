import {IBlock} from './Blocks/IBlock';
import Point = minerva.Point;

export class SaveFile {
    public ColorThemeNo: number;
    public Composition: IBlock[];
    public DragOffset: Point;
    public ZoomLevel: number;
}