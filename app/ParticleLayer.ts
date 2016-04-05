import DisplayObject = etch.drawing.DisplayObject;
import {IApp} from './IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {Particle} from './Particle';

declare var App: IApp;

export class ParticleLayer extends DisplayObject {

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);
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
        for (var i = 0; i < App.Particles.length; i++) {

            // todo: use etch drawFrom to cache
            var particle = App.Particles[i];
            var pos = App.Metrics.FloatOnGrid(particle.Position);
            var unit = App.ScaledUnit;
            var sx = pos.x;
            var sy = pos.y;
            var size = particle.Size * unit;

            App.FillColor(this.Ctx,App.Palette[App.ThemeManager.Power]);
            this.Ctx.globalAlpha = 1;
            this.Ctx.beginPath();
            this.Ctx.moveTo(sx-(size),sy); //l
            this.Ctx.lineTo(sx,sy-(size)); //t
            this.Ctx.lineTo(sx+(size),sy); //r
            this.Ctx.lineTo(sx,sy+(size)); //b
            this.Ctx.closePath();
            this.Ctx.fill();
        }
    }
}
