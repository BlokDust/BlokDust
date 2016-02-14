import DisplayObject = etch.drawing.DisplayObject;
import {IApp} from './IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {Particle} from './Particle';
import Canvas = etch.drawing.Canvas;

declare var App: IApp;

export class ParticleLayer extends DisplayObject {

    Init(drawTo: IDisplayContext, drawFrom?: IDisplayContext): void {
        super.Init(drawTo, drawFrom);
    }

    Update() {
        if (App.Particles.length) {
            this.UpdateParticles();
        }
    }

    UpdateParticles() {
        var currentParticles = [];
        for (var i = 0; i < App.Particles.length; i++) {
            var particle: Particle = App.Particles[i];
            particle.Life -= 1;

            if (particle.Life < 1) {
                particle.Reset();
                particle.ReturnToPool();
                continue;
            }

            particle.ParticleCollision(App.Metrics.FloatOnGrid(particle.Position), particle);
            particle.Move();
            currentParticles.push(particle);
        }

        App.Particles = currentParticles;
    }

    Draw() {

        // if this is the first frame, and it has a display cache that hasn't been drawn to yet.
        // draw to the display cache.
        if (this.IsFirstFrame() && this.DrawFrom && !this.DrawFrom.IsCached){
            this.DrawFrom.Width = 6;
            this.DrawFrom.Height = 6;
            this.DrawToCtx(this.DrawFrom.Ctx);
            this.DrawFrom.IsCached = true;
        }

        for (var i = 0; i < App.Particles.length; i++) {
            var particle: Particle = App.Particles[i];
            var pos = App.Metrics.FloatOnGrid(particle.Position);
            //this.DrawFrom.Width = 10;
            //this.DrawFrom.Height = 10;
            this.Ctx.drawImage((<Canvas>this.DrawFrom).HTMLElement, pos.x, pos.y);
        }
    }

    DrawToCtx(ctx: CanvasRenderingContext2D) {
        //var unit = App.ScaledUnit;
        var width = 6;// particle.Size * unit;
        var height = 6;

        App.FillColor(ctx, App.Palette[8]);
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width, height / 2);
        ctx.lineTo(width / 2, height);
        ctx.lineTo(0, height / 2);
        ctx.closePath();
        ctx.fill();
    }
}
