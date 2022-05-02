/// <reference path="ContentControl.ts" />
/// <reference path="Page.ts" />
/// <reference path="../Navigation/INavigate.ts" />

module Fayde.Controls {
    function createErrorDoc(error: any): nullstone.markup.xaml.XamlMarkup {
        var safe = (error || '').toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
        var xaml = '<Page xmlns="' + Fayde.XMLNS + '" xmlns:x="' + Fayde.XMLNSX + '" Title="Error">';
        xaml += '<TextBlock Text="' + safe + '" />';
        xaml += '</Page>';
        return Markup.CreateXaml(xaml, Fayde.XMLNS + "/frame/error");
    }

    function getErrorPage(app: Application, error: string): Page {
        return Markup.Load<Page>(app, createErrorDoc(error));
    }

    export class Frame extends ContentControl implements Navigation.INavigate {
        static IsDeepLinkedProperty = DependencyProperty.Register("IsDeepLinked", () => Boolean, Frame, true);
        static CurrentSourceProperty = DependencyProperty.RegisterReadOnly("CurrentSource", () => Uri, Frame);
        static SourceProperty = DependencyProperty.Register("Source", () => Uri, Frame, undefined, (d, args) => (<Frame>d).SourcePropertyChanged(args));
        static UriMapperProperty = DependencyProperty.Register("UriMapper", () => Navigation.UriMapper, Frame);
        static RouteMapperProperty = DependencyProperty.Register("RouteMapper", () => Navigation.RouteMapper, Frame);
        static IsLoadingProperty = DependencyProperty.RegisterReadOnly("IsLoading", () => Boolean, Frame, false, (d: Frame, args) => d.OnIsLoadingChanged(args.OldValue, args.NewValue));
        IsDeepLinked: boolean;
        CurrentSource: Uri;
        Source: Uri;
        UriMapper: Navigation.UriMapper;
        RouteMapper: Navigation.RouteMapper;
        IsLoading: boolean;

        private _NavService = new Navigation.NavigationService();
        private _CurrentRoute: Fayde.Navigation.Route = undefined;

        OnIsLoadingChanged(oldIsLoading: boolean, newIsLoading: boolean) {
            this.UpdateVisualState();
        }

        //Navigated = new MulticastEvent();
        //Navigating = new MulticastEvent();
        //NavigationFailed = new MulticastEvent();
        //NavigationStopped = new MulticastEvent();
        //FragmentNavigation = new MulticastEvent();

        constructor() {
            super();
            this.DefaultStyleKey = Frame;
            this.Loaded.on(this._FrameLoaded, this);
        }

        GoToStates(gotoFunc: (state: string) => boolean) {
            this.GoToStateLoading(gotoFunc);
        }

        GoToStateLoading(gotoFunc: (state: string) => boolean): boolean {
            return gotoFunc(this.IsLoading ? "Loading" : "Idle");
        }

        Navigate(uri: Uri): boolean {
            return this._NavService.Navigate(uri);
        }

        GoForward() {
            //TODO: Implement
        }

        GoBackward() {
            //TODO: Implement
        }

        StopLoading() {
            //TODO: Implement
        }

        private _FrameLoaded(sender, e: RoutedEventArgs) {
            if (this.IsDeepLinked) {
                this._NavService.LocationChanged.on(this._HandleDeepLink, this);
                this._HandleDeepLink();
            }
        }

        private _HandleDeepLink() {
            this._LoadContent(this._NavService.CurrentUri);
        }

        private _LoadContent(source: Uri) {
            this.SetCurrentValue(Frame.CurrentSourceProperty, source);
            this.StopLoading();
            this.SetCurrentValue(Frame.IsLoadingProperty, true);

            var fragment = source.fragment;
            if (fragment[0] === "#")
                fragment = fragment.substr(1);
            TimelineProfile.Navigate(true, fragment);

            var targetUri = new Uri(fragment, nullstone.UriKind.Relative);
            var target: string = undefined;
            if (this.RouteMapper) {
                this._CurrentRoute = this.RouteMapper.MapUri(targetUri);
                if (!this._CurrentRoute)
                    throw new InvalidOperationException("Route could not be mapped." + targetUri.toString());
                target = this._CurrentRoute.View.toString();
            }
            else if (this.UriMapper) {
                var mapped = this.UriMapper.MapUri(targetUri);
                if (!mapped)
                    throw new InvalidOperationException("Uri could not be mapped." + targetUri.toString());
                target = mapped.toString();
            }

            Page.GetAsync(this, target)
                .then(page => this._HandleSuccess(page),
                    err => this._HandleError(err));
        }

        private _HandleSuccess(page: Page) {
            this._SetPage(page);
            this.SetCurrentValue(Frame.IsLoadingProperty, false);
            TimelineProfile.Navigate(false);
            TimelineProfile.IsNextLayoutPassProfiled = true;
        }

        private _HandleError(error: any) {
            this._SetPage(getErrorPage(this.App, error));
            this.SetCurrentValue(Frame.IsLoadingProperty, false);
            TimelineProfile.Navigate(false);
        }

        private _SetPage(page: Page) {
            document.title = page.Title;
            this.Content = page;
            if (this._CurrentRoute)
                page.DataContext = this._CurrentRoute.DataContext;
            if (page.DataContext == null)
                page.DataContext = this.DataContext;
        }

        private SourcePropertyChanged(args: IDependencyPropertyChangedEventArgs) {
            //TODO: Ignore in design mode
            if (true)//if loaded and not updating source from nav service
                this.Navigate(args.NewValue);

            //TODO: Show default content uri in Content when in design mode
        }
    }
    Fayde.CoreLibrary.add(Frame);
    nullstone.addTypeInterfaces(Frame, Navigation.INavigate_);
    TemplateVisualStates(Frame,
        {GroupName: "LoadingStates", Name: "Idle"},
        {GroupName: "LoadingStates", Name: "Loading"});
}