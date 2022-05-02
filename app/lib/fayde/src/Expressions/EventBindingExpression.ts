/// <reference path="Expression.ts" />

module Fayde {
    export interface IEventBindingArgs<T extends nullstone.IEventArgs> {
        sender: any;
        args: T;
        parameter: any;
    }

    export class EventBindingExpression extends Expression {
        IsUpdating: boolean = false;
        IsAttached: boolean = false;

        private _EventBinding: Markup.EventBinding;
        private _CommandWalker: Data.PropertyPathWalker = null;
        private _CommandParameterWalker: Data.PropertyPathWalker = null;

        private _Target: XamlObject = null;
        private _Event: nullstone.Event<nullstone.IEventArgs> = null;
        private _EventName: string = null;

        constructor (eventBinding: Markup.EventBinding) {
            super();
            this._EventBinding = eventBinding;

            var cb = this._EventBinding.CommandBinding;
            if (cb)
                this._CommandWalker = new Data.PropertyPathWalker(cb.Path.ParsePath, cb.BindsDirectlyToSource, false, !cb.ElementName && !cb.Source && !cb.RelativeSource);

            var cpb = this._EventBinding.CommandParameterBinding;
            if (cpb)
                this._CommandParameterWalker = new Data.PropertyPathWalker(cpb.Path.ParsePath, cpb.BindsDirectlyToSource, false, !cpb.ElementName && !cpb.Source && !cpb.RelativeSource);
        }

        Seal (owner: DependencyObject, prop: any) {
        }

        Init (eventName: string) {
            this._EventName = eventName;
        }

        GetValue (propd: DependencyProperty): any {
        }

        OnAttached (target: XamlObject) {
            if (this.IsAttached)
                return;
            this.IsAttached = true;
            this._Target = target;
            this._Event = target[this._EventName];
            if (this._Event)
                this._Event.on(this._Callback, this);
        }

        OnDetached (target: XamlObject) {
            if (!this.IsAttached)
                return;
            if (this._Event)
                this._Event.off(this._Callback, this);
            this._Event = null;
            this.IsAttached = false;
        }

        OnDataContextChanged (newDataContext: any) {
        }

        private _Callback (sender: any, e: nullstone.IEventArgs) {
            var target = this._Target;

            var csource = findSource(target, this._EventBinding.CommandBinding);
            var context = csource;
            var etarget = context;
            var cw = this._CommandWalker;
            if (cw) {
                etarget = cw.GetValue(etarget);
                context = cw.GetContext();
                if (context == null) context = csource;
            }
            if (!etarget) {
                console.warn("[EVENTBINDING]: Could not find command target for event '" + this._EventName + "'.");
                return;
            }

            var cargs = {
                sender: sender,
                args: e,
                parameter: null
            };

            var cpb = this._EventBinding.CommandParameterBinding;
            if (cpb) {
                var cpw = this._CommandParameterWalker;
                var cpsource = findSource(target, cpb);
                cargs.parameter = cpw.GetValue(cpsource);
            }


            if (typeof etarget === "function") {
                (<Function>etarget).call(context, cargs);
            } else {
                var ecmd = Fayde.Input.ICommand_.as(etarget);
                if (!ecmd) {
                    console.warn("[EVENTBINDING]: Could not find command target for event '" + this._EventName + "'.");
                    return;
                }
                ecmd = <Fayde.Input.ICommand>etarget;
                if (ecmd.CanExecute.call(context, cargs))
                    ecmd.Execute.call(context, cargs);
            }
        }
    }

    function findSource (target: XamlObject, binding: Data.Binding): any {
        if (binding) {
            if (binding.Source)
                return binding.Source;

            if (binding.ElementName != null)
                return findSourceByElementName(target, binding.ElementName);

            if (binding.RelativeSource) {
                return binding.RelativeSource.Find(target);
            }
        }
        return target.XamlNode.DataContext;
    }

    function findSourceByElementName (target: XamlObject, name: string): XamlObject {
        var xobj: XamlObject = target;
        if (!xobj)
            return undefined;
        var source = xobj.FindName(name, true);
        if (source)
            return source;
        //TODO: Crawl out of ListBoxItem?
        return undefined;
    }
}