/// <reference path="../Core/DependencyObject.ts" />

interface ITimeline {
    Update(nowTime: number);
}

module Fayde {
    export class Application extends DependencyObject implements IResourcable, ITimerListener {
        static Current: Application;
        MainSurface: Surface;
        Loaded = new nullstone.Event();
        Address: Uri = null;
        AllowNavigation = true;
        private _IsRunning: boolean = false;
        private _IsLoaded = false;
        private _Storyboards: ITimeline[] = [];
        private _ClockTimer: ClockTimer = new ClockTimer();
        private _RootVisual: UIElement = null;

        static ResourcesProperty = DependencyProperty.RegisterImmutable<ResourceDictionary>("Resources", () => ResourceDictionary, Application);
        static ThemeNameProperty = DependencyProperty.Register("ThemeName", () => String, Application, "Default", (d: Application, args) => d.OnThemeNameChanged(args));
        Resources: ResourceDictionary;
        ThemeName: string;

        private OnThemeNameChanged (args: DependencyPropertyChangedEventArgs) {
            if (!this._IsLoaded)
                return;
            ThemeManager.LoadAsync(args.NewValue)
                .then(() => this._ApplyTheme(),
                    err => console.error("Could not load theme.", err));
        }

        private _ApplyTheme () {
            for (var walker = this.MainSurface.walkLayers(); walker.step();) {
                for (var subwalker = walker.current.walkDeep(); subwalker.step();) {
                    var node = subwalker.current.getAttachedValue("$node");
                    Providers.ImplicitStyleBroker.Set(<FrameworkElement>node.XObject, Providers.StyleMask.Theme);
                }
            }
        }

        Resized = new RoutedEvent<SizeChangedEventArgs>();

        OnResized (oldSize: minerva.Size, newSize: minerva.Size) {
            this.Resized.raise(this, new SizeChangedEventArgs(oldSize, newSize));
        }

        constructor () {
            super();
            this.XamlNode.NameScope = new NameScope(true);
            var rd = Application.ResourcesProperty.Initialize(this);
            this.MainSurface = new Surface(this);
            this.Address = new Uri(document.URL);
        }

        get RootVisual (): UIElement {
            for (var walker = this.MainSurface.walkLayers(); walker.step();) {
                var node = walker.current.getAttachedValue("$node");
                return node.XObject;
            }
        }

        $$SetRootVisual (value: UIElement) {
            this._RootVisual = value;
        }

        Attach (canvas: HTMLCanvasElement) {
            this.MainSurface.init(canvas);
            this.MainSurface.Attach(this._RootVisual, true);
        }

        Start () {
            this.Update();
            this.Render();
            this._ClockTimer.RegisterTimer(this);
            this._IsLoaded = true;
            this.Loaded.raiseAsync(this, null);
        }

        OnTicked (lastTime: number, nowTime: number) {
            this.ProcessStoryboards(lastTime, nowTime);
            this.Update();
            this.Render();
        }

        private StopEngine () {
            this._ClockTimer.UnregisterTimer(this);
        }

        private ProcessStoryboards (lastTime: number, nowTime: number) {
            perfex.timer.start('StoryboardsProcess', this);
            for (var i = 0, sbs = this._Storyboards; i < sbs.length; i++) {
                sbs[i].Update(nowTime);
            }
            perfex.timer.stop();
        }

        private Update () {
            if (this._IsRunning)
                return;
            this._IsRunning = true;
            perfex.timer.start('UpdateLayout', this);
            var updated = this.MainSurface.updateLayout();
            perfex.timer.stop();
            this._IsRunning = false;
        }

        private Render () {
            perfex.timer.start('Render', this);
            this.MainSurface.render();
            perfex.timer.stop();
        }

        RegisterStoryboard (storyboard: ITimeline) {
            var sbs = this._Storyboards;
            var index = sbs.indexOf(storyboard);
            if (index === -1)
                sbs.push(storyboard);
        }

        UnregisterStoryboard (storyboard: ITimeline) {
            var sbs = this._Storyboards;
            var index = sbs.indexOf(storyboard);
            if (index !== -1)
                sbs.splice(index, 1);
        }

        static GetAsync (url: string): nullstone.async.IAsyncRequest<Application> {
            return nullstone.async.create((resolve, reject) => {
                Markup.Resolve(url)
                    .then(appm => {
                        TimelineProfile.Parse(true, "App");
                        var app = Markup.Load<Application>(null, appm);
                        TimelineProfile.Parse(false, "App");
                        if (!(app instanceof Application))
                            reject("Markup must be an Application.");
                        else
                            resolve(app);
                    }, reject);
            });
        }

        Resolve (): nullstone.async.IAsyncRequest<Application> {
            return nullstone.async.create((resolve, reject) => {
                //TODO: Resolve theme
                resolve(this);
            });

            /*
             var d = defer<Application>();

             var lib = Library.Get("lib:Fayde");
             lib.Resolve({ThemeName: this.ThemeName || "Default", Resolving: []})
             .success(lib => {
             this._CoreLibrary = lib;
             d.resolve(this);
             })
             .error(d.reject);

             return d.request;
             */
        }
    }
    Fayde.CoreLibrary.add(Application);
}