import Canvas = etch.drawing.Canvas;
import {IApp} from "./IApp";
import {MainScene} from "./MainScene";
import {Splash} from "./Splash";
import {CompositionLoadedEventArgs} from "./CompositionLoadedEventArgs";

declare var App: IApp;

export class Stage extends etch.drawing.Stage{

    public Splash: Splash;
    public MainScene: MainScene;

    constructor() {
        super();

        this.MainScene = new MainScene();
        this.DisplayList.Add(this.MainScene);
        this.MainScene.Init(App.Canvas);
        this.MainScene.Hide();

        this.Splash = new Splash();
        this.DisplayList.Add(this.Splash);
        this.Splash.Init(App.Canvas);

        this.Splash.TransitionIn();

        this.Splash.AnimationFinished.on((s: any) => {
            if (!App.IsLoadingComposition){
                this.MainScene.Show();
                this.Splash.TransitionOut();
            }
        }, this);

        App.CompositionLoaded.on((s: any, e: CompositionLoadedEventArgs) => {
            this.CompositionLoaded(e);
        }, this);
    }

    CompositionLoaded(e: CompositionLoadedEventArgs): void {
        this.Splash.TransitionOut();
        this.MainScene.Show();
    }
}