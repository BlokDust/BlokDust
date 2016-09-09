import Vector = etch.primitives.Vector;// Utils.Maths.Vector;
import DisplayObject = etch.drawing.DisplayObject;
import {IApp} from './IApp';
import {ISource} from './Blocks/ISource';
import {Laser} from './Blocks/Power/Laser';
import {Logic} from './Blocks/Power/Logic/Logic';
import {MainScene} from './MainScene';
import {Source} from './Blocks/Source';
import {Void} from './Blocks/Power/Void';
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;

declare var App: IApp;

export class LaserBeams extends DisplayObject {

    public UpdateAllLasers: boolean;
    //private _TestPoints: Point[];

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);
        this.UpdateAllLasers = false;
        //this._TestPoints = [];
    }

    update() {
        //console.log("BEAMS");
        this.UpdateCollisions();
    }

    QuadPartition(p1,p2,angle) {

        var margin = App.ScaledGridSize*1.7;
        var laser = p1;
        var target = p2;

        if (angle<0 && angle > -180 && target.y > (laser.y + margin)) { // NOT TOP
            return false;
        }
        if ((angle>0 || angle < -180) && target.y < (laser.y - margin)) { // NOT BOTTOM
            return false;
        }
        if (angle<=-90 && target.x > (laser.x + margin)) { // NOT LEFT
            return false;
        }
        if (angle>-90 && target.x < (laser.x - margin)) { // NOT LEFT
            return false;
        }
        return true;
    }

    PointFromLine(x, y, x0, y0, x1, y1, o) {
        function lineLength(x, y, x0, y0){
            return Math.sqrt((x -= x0) * x + (y -= y0) * y);
        }
        if(o && !(o = function(x, y, x0, y0, x1, y1){
                if(!(x1 - x0)) return {x: x0, y: y};
                else if(!(y1 - y0)) return {x: x, y: y0};
                var left, tg = -1 / ((y1 - y0) / (x1 - x0));
                return {x: left = (x1 * (x * tg - y + y0) + x0 * (x * - tg + y - y1)) / (tg * (x1 - x0) + y0 - y1), y: tg * left - tg * x + y};
            }(x, y, x0, y0, x1, y1), o.x >= Math.min(x0, x1) && o.x <= Math.max(x0, x1) && o.y >= Math.min(y0, y1) && o.y <= Math.max(y0, y1))){
            var l1 = lineLength(x, y, x0, y0), l2 = lineLength(x, y, x1, y1);
            return l1 > l2 ? l2 : l1;
        }
        else {
            var a = y0 - y1, b = x1 - x0, c = x0 * y1 - y0 * x1;
            return Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);
        }
    }

    PointFromPoint(x, y, x0, y0){
        return Math.sqrt((x -= x0) * x + (y -= y0) * y);
    }

    UpdateCollisions() {

        if (App.Audio.ConnectionManager.IsConnected) {

            var p1: Point;
            var p2: Point;
            var vector: Vector;
            var line: Vector;
            var outline: Point[];
            var rectSize: number = 1.7; // size of rectangle for rough check (in grid cells)
            var grd: number = App.ScaledGridSize * rectSize;

            // SETUP LISTS //
            // TODO: do this once when Blocks[] changes
            var voidlist = []; // we'll make a list of all void blocks so we can check those first
            var sourcelist = []; // get all other checks;
            var laserlist = [];
            var checklist = []; // void & source combined;

            for (var i = 0; i < App.Blocks.length; i++) {
                var block:any = App.Blocks[i];

                if (block instanceof Void) {
                    voidlist.push(block);
                }
                if ((block instanceof Source || block instanceof Logic)) {
                    sourcelist.push(block);
                }
                if (block instanceof Laser) {
                    laserlist.push(block);
                }
                checklist = voidlist.concat(sourcelist); // combine
            }

            // LOOK FOR LASERS //
            for (var i = 0; i < laserlist.length; i++) {
                var laser:ISource = laserlist[i];

                // gets set to true when blocks are moved
                if (this.UpdateAllLasers) {
                    laser.UpdateCollision = true;
                }

                // if this blocks collisions should be updated
                if (laser.UpdateCollision) {

                    laser.UpdateCollision = false;
                    laser.CheckRange = laser.Params.range;
                    var collisions = [];

                    // If we're in self powered mode, or if this is powered
                    if (laser.Params.selfPoweredMode || laser.IsPowered()) {


                        vector = Vector.multN(Vector.fromAngle(Math.degreesToRadians(laser.Params.angle)), App.ScaledUnit);
                        line = Vector.multN(vector, laser.CheckRange);

                        // FOR EACH LASER LOOK FOR SOURCE COLLISIONS //
                        for (var j = 0; j < checklist.length; j++) {
                            var block:any = checklist[j];

                            if (block !== laser) { // stop hitting yourself... stop hitting yourself... etc


                                outline = [];
                                p1 = App.Metrics.UndraggedPointOnGrid(laser.Position);
                                p2 = App.Metrics.UndraggedPointOnGrid(block.Position);

                                // IF IN RANGE //
                                if (this.PointFromPoint(p1.x, p1.y, p2.x, p2.y) < ((laser.CheckRange * App.ScaledUnit) + grd)) {


                                    // IF IN QUADRANT //
                                    if (this.QuadPartition(p1, p2, laser.Params.angle)) {


                                        //IF CLOSE TO LINE //
                                        if (this.PointFromLine(p2.x, p2.y, p1.x, p1.y, p1.x + line.x, p1.y + line.y, false) < grd) {


                                            // INTERSECT CHECK //
                                            for (var k = 0; k < block.Outline.length; k++) {
                                                outline.push(App.Metrics.UndraggedPointOnGrid(App.Metrics.GetRelativePoint(block.Outline[k], block.Position)));
                                            }
                                            p2 = new Point(p1.x + line.x, p1.y + line.y);
                                            var intersection = Intersection.intersectLinePolygon(p1, p2, outline);
                                            if (intersection.status == "Intersection") {

                                                // THERE IS A COLLISION //
                                                
                                                // VOID BLOCKS //
                                                if (block instanceof Void) {
                                                    var intersect = intersection.points;

                                                    for (var h = 0; h < intersect.length; h++) {
                                                        var dist = this.PointFromPoint(p1.x, p1.y, intersect[h].x, intersect[h].y) / App.ScaledUnit;
                                                        if (dist < laser.CheckRange) {
                                                            laser.CheckRange = dist;
                                                        }
                                                    }
                                                }

                                                // SOURCE BLOCKS //
                                                else {
                                                    collisions.push(block);
                                                    if (laser.Collisions.length == 0 || $.inArray(block, laser.Collisions) == -1) {
                                                        if (block instanceof Logic) {
                                                            block.ScheduleLogic();
                                                        } else {
                                                            /*if (!block.IsPowered()) {
                                                                block.TriggerAttack();
                                                                //block.ScheduleAttack();
                                                            }*/
                                                            //console.log(block.PowerConnections);
                                                            //block.PowerConnections += 1;
                                                            block.AddPower();
                                                            (<MainScene>this.drawTo).ConnectionLines.UpdateList();
                                                        }
                                                    }
                                                }
                                            }

                                        } // end line

                                    } // end quad

                                } // end range

                            } // end if right block

                        }// end block loop

                    } // end if powered

                    // FOR EACH COLLISION CHECK RELEASE //
                    if (laser.Collisions && laser.Collisions.length) {
                        for (var j = 0; j < laser.Collisions.length; j++) {
                            var block = laser.Collisions[j];
                            if (collisions.length == 0 || $.inArray(block, collisions) == -1) {
                                if (!(block instanceof Logic)) {
                                    block.RemovePower();
                                    (<MainScene>this.drawTo).ConnectionLines.UpdateList();
                                }
                            }
                        }
                    }
                    // UPDATE COLLISIONS ARRAY
                    laser.Collisions = collisions;

                } // end if collisions don't need updating for this block


            } // end laser loop

            this.UpdateAllLasers = false;

        } // end audiomanager is connected
    }

    draw() {
        var unit = App.ScaledUnit;
        var myPos: Point;
        var vector: Vector;
        //App.FillColor(this.ctx,App.Palette[8]);
        App.StrokeColor(this.ctx,App.Palette[App.ThemeManager.Power]);
        this.ctx.globalAlpha = 1;

        this.ctx.lineWidth = (unit*2) * (0.8 + (Math.random()*0.5));
        //this.ctx.lineWidth = unit*2;
        this.ctx.beginPath();

        for (var j=0; j<App.Sources.length; j++) {
            var laser: ISource  = App.Sources[j];
            if (laser instanceof Laser) {

                // If we're in self powered mode, or if this is powered
                if (laser.Params.selfPoweredMode || laser.IsPowered()) {

                    myPos = App.Metrics.PointOnGrid(laser.Position);

                    vector = Vector.fromAngle(Math.degreesToRadians(laser.Params.angle));
                    vector.mult(laser.CheckRange * unit);

                    this.ctx.moveTo(myPos.x, myPos.y);
                    this.ctx.lineTo(myPos.x + vector.x, myPos.y + vector.y);
                }
            }
        }
        this.ctx.stroke();
        this.ctx.lineWidth = 1;

        // TEST //
        /*this.ctx.beginPath();
        this.ctx.moveTo(0,0);
        for (var i=0; i<this._TestPoints.length; i++) {
            //this.ctx.fillRect(this._TestPoints[i].x - (30*unit),this._TestPoints[i].y - (30*unit),60*unit,60*unit);
            this.ctx.lineTo(this._TestPoints[i].x,this._TestPoints[i].y);
        }
        this.ctx.stroke();*/
    }
}