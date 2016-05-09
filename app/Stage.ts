import Canvas = etch.drawing.Canvas;
import {IApp} from './IApp';
import {MainScene} from './MainScene';
import {Splash} from './Splash';
import {CompositionLoadedEventArgs} from './CompositionLoadedEventArgs';
import {CompositionLoadFailedEventArgs} from "./CompositionLoadFailedEventArgs";

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

        this.Splash.AnimationFinished.on((s: any) => {
            if (!App.IsLoadingComposition){
                this.MainScene.Show();
                this.Splash.TransitionOut();
            }
        }, this);

        App.CompositionLoaded.on((s: any, e: CompositionLoadedEventArgs) => {
            this.CompositionLoaded(e);
        }, this);

        App.CompositionLoadFailed.on((s: any, e: CompositionLoadFailedEventArgs) => {
            this.CompositionLoadFailed(e);
        }, this);
    }

    CompositionLoaded(e: CompositionLoadedEventArgs): void {
        if (this.Splash.IsAnimationFinished) {
            this.Splash.TransitionOut();
            this.MainScene.Show();
        }
    }

    CompositionLoadFailed(e: CompositionLoadFailedEventArgs): void {
        this.Splash.Hide();
        this.MainScene.Show();
        this.MainScene.MessagePanel.NewMessage(App.L10n.Errors.LoadError);
    }

    //OnTicked(lastTime: number, nowTime: number) {
    //    super.OnTicked(lastTime, nowTime);
    //}
    //
    //UpdateDisplayList(displayList: DisplayObjectCollection<IDisplayObject>): void {
    //    super.UpdateDisplayList(displayList);
    //}
    //
    //DrawDisplayList(displayList: DisplayObjectCollection<IDisplayObject>): void {
    //    super.DrawDisplayList(displayList);
    //}
    //
    //ResizeDisplayList(displayList: DisplayObjectCollection<IDisplayObject>): void {
    //    super.ResizeDisplayList(displayList);
    //}
    //
    //Resize(): void {
    //    super.Resize();
    //}
}