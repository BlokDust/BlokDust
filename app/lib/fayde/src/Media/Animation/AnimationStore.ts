
module Fayde.Media.Animation {
    export interface IAnimationStorage {
        ID: number;
        Animation: AnimationBase;
        PropStorage: Providers.IPropertyStorage;
        IsDisabled: boolean;
        BaseValue: any;
        CurrentValue: any;
        StopValue: any;
    }

    export class AnimationStore {
        static Create(target: DependencyObject, propd: DependencyProperty): IAnimationStorage {
            var baseValue = target.GetValue(propd);
            if (baseValue === undefined) {
                var targetType = propd.GetTargetType();
                if (targetType === Number)
                    baseValue = 0;
                else if (targetType === String)
                    baseValue = "";
                else
                    baseValue = new (<any>targetType)();
            }
            return {
                ID: createId(),
                Animation: undefined,
                PropStorage: Providers.GetStorage(target, propd),
                IsDisabled: false,
                BaseValue: baseValue,
                CurrentValue: undefined,
                StopValue: undefined,
            };
        }
        static Attach(animStorage: IAnimationStorage) {
            var storage = animStorage.PropStorage;
            var list = storage.Animations;
            if (!list)
                storage.Animations = list = [];
            var prevStorage = list[list.length - 1];
            list.push(animStorage);
            if (prevStorage) {
                animStorage.StopValue = prevStorage.StopValue;
                prevStorage.IsDisabled = true;
            } else {
                animStorage.StopValue = storage.Local;
            }
        }
        static Detach(animStorage: IAnimationStorage): boolean {
            var storage = animStorage.PropStorage;

            var list = storage.Animations;
            if (!list)
                return false;

            var len = list.length;
            if (len < 1)
                return false;

            var i = list.lastIndexOf(animStorage);
            if (i === (len - 1)) {
                list.pop();
                if (len > 1) {
                    var last = list[len - 2];
                    if (last.IsDisabled) {
                        last.IsDisabled = false;
                        AnimationStore.ApplyCurrent(last);
                        return true;
                    }
                }
            } else {
                list.splice(i, 1);
                list[i].StopValue = animStorage.StopValue;
            }
            return false;
        }
        static ApplyCurrent(animStorage: IAnimationStorage) {
            var val = animStorage.CurrentValue;
            if (val === undefined)
                return;
            if (Animation.LogApply)
                console.log(getLogMessage("ApplyCurrent", animStorage, val));
            var storage = animStorage.PropStorage;
            storage.Property.Store.SetLocalValue(storage, animStorage.CurrentValue);
        }
        static ApplyStop(animStorage: IAnimationStorage) {
            var val = animStorage.StopValue;
            if (Animation.LogApply)
                console.log(getLogMessage("ApplyStop", animStorage, val));
            var storage = animStorage.PropStorage;
            storage.Property.Store.SetLocalValue(storage, val);
        }
    }

    function getLogMessage(action: string, animStorage: IAnimationStorage, val: any): string {
        var anim = animStorage.Animation;
        var name = Storyboard.GetTargetName(animStorage.Animation);
        if (anim.HasManualTarget)
            name = anim.ManualTarget.Name;
        var prop = Storyboard.GetTargetProperty(anim);
        var msg = "ANIMATION:" + action + ":" + animStorage.ID + "[" + name + "](" + prop.Path + ")->";
        msg += val === undefined ? "(undefined)" : (val === null ? "(null)" : val.toString());
        return msg;
    }
    var lastId = 0;
    function createId(): number {
        return lastId++;
    }
}