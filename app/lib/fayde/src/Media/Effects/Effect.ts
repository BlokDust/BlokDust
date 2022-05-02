/// <reference path="../../Core/DependencyObject.ts" />
/// <reference path="../GeneralTransform.ts" />

module Fayde.Media.Effects {
    export class Effect extends DependencyObject implements minerva.IEffect {
        static EffectMappingProperty = DependencyProperty.Register("EffectMapping", () => GeneralTransform, Effect);
        EffectMapping: GeneralTransform;

        PreRender (ctx: minerva.core.render.RenderContext) {
        }

        PostRender (ctx: minerva.core.render.RenderContext) {
        }

        GetPadding (thickness: Thickness): boolean {
            return false;
        }
    }
    Fayde.CoreLibrary.add(Effect);

    module reactions {
        DPReaction<GeneralTransform>(Effect.EffectMappingProperty, (dobj, ov, nv) => Incite(dobj));
    }
}