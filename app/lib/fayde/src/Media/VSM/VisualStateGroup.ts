/// <reference path="../../Core/DependencyObject.ts" />
/// <reference path="../../Core/XamlObjectCollection.ts" />

module Fayde.Media.VSM {
    export class VisualStateChangedEventArgs implements nullstone.IEventArgs {
        OldState: VisualState;
        NewState: VisualState;
        Control: Controls.Control;
        constructor(oldState: VisualState, newState: VisualState, control: Controls.Control) {
            Object.defineProperty(this, "OldState", { value: oldState, writable: false });
            Object.defineProperty(this, "NewState", { value: newState, writable: false });
            Object.defineProperty(this, "Control", { value: control, writable: false });
        }
    }

    export class VisualStateGroup extends DependencyObject {
        static StatesProperty = DependencyProperty.RegisterImmutable<VisualStateCollection>("States", () => VisualStateCollection, VisualStateGroup);
        States: VisualStateCollection;

        static TransitionsProperty = DependencyProperty.RegisterImmutable<XamlObjectCollection<VisualTransition>>("Transitions", () => XamlObjectCollection, VisualStateGroup);
        Transitions: XamlObjectCollection<VisualTransition>;

        private _CurrentStoryboards: Animation.Storyboard[] = [];
        get CurrentStoryboards(): Animation.Storyboard[] {
            return this._CurrentStoryboards.slice(0);
        }
        CurrentStateChanging = new nullstone.Event<VisualStateChangedEventArgs>();
        CurrentStateChanged = new nullstone.Event<VisualStateChangedEventArgs>();
        CurrentState: VisualState = null;

        constructor() {
            super();
            VisualStateGroup.StatesProperty.Initialize(this);
            VisualStateGroup.TransitionsProperty.Initialize(this);
        }

        GetState(stateName: string): VisualState {
            var enumerator = this.States.getEnumerator();
            var state: VisualState;
            while (enumerator.moveNext()) {
                state = enumerator.current;
                if (state.Name === stateName)
                    return state;
            }
            return null;
        }

        StartNewThenStopOld(element: FrameworkElement, newStoryboards: Animation.Storyboard[]) {
            var i: number;
            var storyboard: Animation.Storyboard;
            var res = element.Resources;
            for (i = 0; i < newStoryboards.length; i++) {
                storyboard = newStoryboards[i];
                if (storyboard == null)
                    continue;
                res.Set((<any>storyboard)._ID, storyboard);
                try {
                    storyboard.Begin();
                } catch (err) {
                    //clear storyboards on error
                    for (var j = 0; j <= i; j++) {
                        if (newStoryboards[j] != null)
                            res.Set((<any>newStoryboards[j])._ID, undefined);
                    }
                    console.warn(err);
                }
            }

            this.StopCurrentStoryboards(element);

            var curStoryboards = this._CurrentStoryboards;
            for (i = 0; i < newStoryboards.length; i++) {
                if (newStoryboards[i] == null)
                    continue;
                curStoryboards.push(newStoryboards[i]);
            }
        }
        StopCurrentStoryboards(element: FrameworkElement) {
            var curStoryboards = this._CurrentStoryboards;
            var storyboard: Animation.Storyboard;
            for (var en = nullstone.IEnumerator_.fromArray(curStoryboards); en.moveNext();) {
                storyboard = en.current;
                if (!storyboard)
                    continue;
                element.Resources.Set((<any>storyboard)._ID, undefined);
                storyboard.Stop();
            }
            this._CurrentStoryboards = [];
        }

        Deactivate () {
            for (var en = nullstone.IEnumerator_.fromArray(this._CurrentStoryboards); en.moveNext();) {
                en.current && en.current.Pause();
            }
        }

        Activate () {
            for (var en = nullstone.IEnumerator_.fromArray(this._CurrentStoryboards); en.moveNext();) {
                en.current && en.current.Resume();
            }
        }

        RaiseCurrentStateChanging(element: FrameworkElement, oldState: VisualState, newState: VisualState, control: Controls.Control) {
            this.CurrentStateChanging.raise(this, new VisualStateChangedEventArgs(oldState, newState, control));
        }
        RaiseCurrentStateChanged(element: FrameworkElement, oldState: VisualState, newState: VisualState, control: Controls.Control) {
            this.CurrentStateChanged.raise(this, new VisualStateChangedEventArgs(oldState, newState, control));
        }
    }
    Fayde.CoreLibrary.add(VisualStateGroup);
    Markup.Content(VisualStateGroup, VisualStateGroup.StatesProperty);

    export class VisualStateGroupCollection extends XamlObjectCollection<VisualStateGroup> {
    }
    Fayde.CoreLibrary.add(VisualStateGroupCollection);
}