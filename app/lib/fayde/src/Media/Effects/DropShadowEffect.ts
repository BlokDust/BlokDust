/// <reference path="Effect.ts" />
/// <reference path="../../Primitives/Color.ts" />

module Fayde.Media.Effects {
    export class DropShadowEffect extends Effect {
        static MAX_BLUR_RADIUS: number = 20;
        static MAX_SHADOW_DEPTH: number = 300;

        static BlurRadiusProperty = DependencyProperty.Register("BlurRadius", () => Number, DropShadowEffect, 5.0, Incite);
        static ColorProperty = DependencyProperty.Register("Color", () => Color, DropShadowEffect, Color.KnownColors.Black, Incite);
        static DirectionProperty = DependencyProperty.Register("Direction", () => Number, DropShadowEffect, 315.0, Incite);
        static OpacityProperty = DependencyProperty.Register("Opacity", () => Number, DropShadowEffect, 1.0, Incite);
        static ShadowDepthProperty = DependencyProperty.Register("ShadowDepth", () => Number, DropShadowEffect, 5.0, Incite);
        BlurRadius: number;
        Color: Color;
        Direction: number;
        Opacity: number;
        ShadowDepth: number;

        GetPadding (thickness: Thickness): boolean {
            var radius = Math.min(this.BlurRadius, DropShadowEffect.MAX_BLUR_RADIUS);
            var depth = Math.min(Math.max(0, this.ShadowDepth), DropShadowEffect.MAX_SHADOW_DEPTH);
            var direction = this.Direction * Math.PI / 180.0;
            var width = Math.ceil(radius);

            var offsetX = Math.cos(direction) * depth;
            var offsetY = Math.sin(direction) * depth;

            var left = -offsetX + width;
            var top = offsetY + width;
            var right = offsetX + width;
            var bottom = -offsetY + width;

            var l = left < 1.0 ? 1.0 : Math.ceil(left);
            var t = top < 1.0 ? 1.0 : Math.ceil(top);
            var r = right < 1.0 ? 1.0 : Math.ceil(right);
            var b = bottom < 1.0 ? 1.0 : Math.ceil(bottom);
            var changed = thickness.left !== l
                || thickness.top !== t
                || thickness.right !== r
                || thickness.bottom !== b;

            thickness.left = l;
            thickness.top = t;
            thickness.right = r;
            thickness.bottom = b;

            return changed;
        }

        PreRender (ctx: minerva.core.render.RenderContext) {
            var color = this.Color;
            var opacity = color.A * this.Opacity;

            var radius = Math.min(this.BlurRadius, DropShadowEffect.MAX_BLUR_RADIUS);
            var depth = Math.min(Math.max(0, this.ShadowDepth), DropShadowEffect.MAX_SHADOW_DEPTH);
            var direction = this.Direction * Math.PI / 180.0;
            var offsetX = Math.cos(direction) * depth;
            var offsetY = -Math.sin(direction) * depth;

            var raw = ctx.raw;
            raw.shadowColor = "rgba(" + color.R + "," + color.G + "," + color.B + "," + opacity + ")";
            raw.shadowBlur = radius;
            raw.shadowOffsetX = offsetX;
            raw.shadowOffsetY = offsetY;
        }
    }
    Fayde.CoreLibrary.add(DropShadowEffect);
}