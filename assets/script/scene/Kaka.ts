import TurnPageRender from "../render/turnpage/TurnPageRender";
import BezierTest from "../tool/BezierTest";



const { ccclass, property, executeInEditMode } = cc._decorator;
const LimiTime = 0.03;

@ccclass
@executeInEditMode
export default class Kaka extends cc.Component {

    private _updateTime: number = 0;
    private _graphics: cc.Graphics = null;
    private _bezierTool: BezierTest = null;
    private _turnPageRender: TurnPageRender = null;

    // onLoad () {}

    start() {
        this._graphics = cc.find("graphics", this.node).getComponent(cc.Graphics);
        this._bezierTool = new BezierTest();
        this._turnPageRender = cc.find("kaka", this.node).getComponent(TurnPageRender);
    }

    update(dt) {
        this._updateTime += dt;
        if (this._updateTime > LimiTime) {
            this._updateTime = 0;
            this._doUpdateBezier();
        }
    }

    private _doUpdateBezier(): void {
        let cp = this._getPoints(),
            bPoints: cc.Vec2[] = [],
            lPoints: cc.Vec2[] = [],
            wPoints: cc.Vec2[] = [],
            num = this._turnPageRender.triangleNum / 2,
            t = 1 / num;

        let matrix = new cc.Mat4();
        this._graphics.node.getWorldMatrix(matrix);
        let tx = matrix["m12"], ty = matrix["m13"];

        let len = 0, d = 0;
        lPoints.push(cc.v2(cp[0].x, cp[0].y));

        for (let i = 0; i <= num; i++) {
            // 直线上的点
            d = this._bezierTool.lengthOnCubicBezier(cp, t * i, t);
            lPoints.push(cc.v2(
                lPoints[lPoints.length - 1].x + d,
                lPoints[lPoints.length - 1].y
            ));

            // 曲线上的点
            let point = this._bezierTool.pointOnCubicBezier(cp, t * i);
            bPoints.push(point);

            // 曲线上的点的世界坐标
            wPoints.push(cc.v2(point.x + tx, point.y + ty));

            len += d;
        }

        this._graphics.clear();
        for (let i = 0; i < bPoints.length; i++) {
            let point = bPoints[i];
            if (i == 0) {
                this._graphics.moveTo(point.x, point.y);
            } else {
                this._graphics.lineTo(point.x, point.y);
            }
        }
        for (let i = 0; i < lPoints.length; i++) {
            let point = lPoints[i];
            if (i == 0) {
                this._graphics.moveTo(point.x, point.y);
            } else {
                this._graphics.lineTo(point.x, point.y);
            }
        }
        this._graphics.stroke();

        this._turnPageRender.updatePage(wPoints);
    }

    private _getPoints(): cc.Vec2[] {
        let p0 = cc.find("p0", this.node), p1 = cc.find("p1", this.node),
            p2 = cc.find("p2", this.node), p3 = cc.find("p3", this.node);
        return [cc.v2(p0.position), cc.v2(p1.position), cc.v2(p2.position), cc.v2(p3.position)];
    }
}
