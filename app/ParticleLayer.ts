import DisplayObject = etch.drawing.DisplayObject;
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {Particle} from './Particle';
import IDisplayContext = etch.drawing.IDisplayContext;
import {Logic} from './Blocks/Power/Logic/Logic';
import {ParticleEmitter} from './Blocks/Power/ParticleEmitter';
import {Source} from './Blocks/Source';
import Vector = etch.primitives.Vector;
import {Void} from './Blocks/Power/Void';

declare var App: IApp;

export class ParticleLayer extends DisplayObject {

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);
    }

    update() {
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

            this.ParticleCollision(App.Metrics.FloatOnGrid(particle.Position), particle);
            particle.Move();
            currentParticles.push(particle);
        }

        App.Particles = currentParticles;
    }

    ParticleCollision(point: Point, particle: Particle) {
        for (var i = App.Blocks.length - 1; i >= 0 ; i--){

            var block: IBlock = App.Blocks[i];

            // Particle can only collide with Switches and Sources but not Particle Emitters //
            // Skip over Particle Emitters Particle Emitters //
            if (block instanceof ParticleEmitter) {
                continue;
            }

            // Skip if block isn't in the right quadrant //
            var quadCheck = this.QuadPartition(particle.Position, App.Metrics.ConvertGridUnitsToAbsolute(block.Position), particle.Vector);
            //console.log(quadCheck);
            if (!quadCheck) {
                continue;
            }

            // If we hit a Void block //
            if (block instanceof Void) {
                if (block.HitTest(point)){
                    particle.Dispose();
                    return;
                }
            }

            // If we hit a switch or a source //
            if (block instanceof Logic || block instanceof Source) {
                if (block.HitTest(point)){
                    block.ParticleCollision(particle);
                    return;
                }
            }
        }
    }

    QuadPartition(particle: Point, target: Point, vector: Vector) {

        var margin = App.ScaledGridSize*2;

        if (vector.y < 0 && target.y > (particle.y + margin)) { // MOVING UP BUT TARGET BELOW
            //console.log(0);
            return false;
        }
        if (vector.y > 0 && target.y < (particle.y - margin)) { // MOVING DOWN BUT TARGET ABOVE
            //console.log(1);
            return false;
        }
        if (vector.x < 0 && target.x > (particle.x + margin)) { // MOVING LEFT BUT TARGET RIGHT
            //console.log(2);
            return false;
        }
        if (vector.x > 0 && target.x < (particle.x - margin)) { // MOVING RIGHT BUT TARGET LEFT
            //console.log(3);
            return false;
        }
        return true;
    }

    draw() {
        for (var i = 0; i < App.Particles.length; i++) {

            // todo: use etch drawFrom to cache
            var particle = App.Particles[i];
            var pos = App.Metrics.FloatOnGrid(particle.Position);
            var unit = App.ScaledUnit;
            var sx = pos.x;
            var sy = pos.y;
            var size = particle.Size * unit;

            App.FillColor(this.ctx,App.Palette[App.ThemeManager.Power]);
            this.ctx.globalAlpha = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(sx-(size),sy); //l
            this.ctx.lineTo(sx,sy-(size)); //t
            this.ctx.lineTo(sx+(size),sy); //r
            this.ctx.lineTo(sx,sy+(size)); //b
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
}
