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
        this.displayList.add(this.MainScene);
        this.MainScene.init(App.Canvas);
        this.MainScene.hide();

        this.Splash = new Splash();
        this.displayList.add(this.Splash);
        this.Splash.init(App.Canvas);

        this.Splash.AnimationFinished.on((s: any) => {
            if (!App.IsLoadingComposition){
                this.MainScene.show();
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
            this.MainScene.show();
        }
    }

    CompositionLoadFailed(e: CompositionLoadFailedEventArgs): void {
        this.Splash.hide();
        this.MainScene.show();
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
    //resize(): void {
    //    super.resize();
    //}
}