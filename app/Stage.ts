import Canvas = etch.drawing.Canvas;
import {IApp} from "./IApp";
import {MainScene} from "./MainScene";

declare var App: IApp;

export class Stage extends etch.drawing.Stage{

    public MainScene: MainScene;

    constructor() {
        super();
        this.MainScene = new MainScene();
        this.DisplayList.Add(this.MainScene);
        this.MainScene.Init(App.Canvas);
    }
}