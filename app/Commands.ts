import {StringValue} from "./StringValue";

class Command extends StringValue {

}

export class Commands {
    public static CREATE_BLOCK = new Command("createBlock");
    public static DELETE_BLOCK = new Command("deleteBlock");
    public static LOAD = new Command("load");
    public static MOVE_BLOCK = new Command("moveBlock");
    public static REDO = new Command("redo");
    public static SAVE = new Command("save");
    public static SAVE_AS = new Command("saveAs");
    public static UNDO = new Command("undo");
}