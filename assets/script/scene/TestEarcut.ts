import earcut from "../bin/earcut"

const { ccclass, property, executeInEditMode } = cc._decorator;

const LimiTime = 0.03;

@ccclass
@executeInEditMode
export default class TestEarcut extends cc.Component {

    private _polygon: cc.PolygonCollider = null;
    private _points: cc.Vec2[] = [];

    // 测试绘制用
    private _updateTime: number = 0;
    private _graphics: cc.Graphics = null;

    public onLoad(): void {
    }

    public start(): void {
        this._bindProps();
    }

    public update(dt): void {
        this._updateTime += dt;
        if (this._updateTime > LimiTime) {
            this._updateTime = 0;
            this._getPoint();
            this._draw(this._points);
        }
    }

    /** 绑定属性 */
    private _bindProps(): void {
        this._graphics = cc.find("graphics", this.node).getComponent(cc.Graphics);
        this._polygon = cc.find("k1", this.node).getComponent(cc.PolygonCollider);
    }

    /** 绘制 */
    private _draw(points: cc.Vec2[]): void {
        this._graphics.clear();

        let pointArr: number[] = [];
        points.forEach((p: cc.Vec2) => {
            pointArr.push(p.x);
            pointArr.push(p.y);
        });

        let indexArr: number[] = [];
        indexArr = earcut(pointArr);

        let tx: number = this._polygon.node.x,
            ty: number = this._polygon.node.y;

        for (let i = 0; i < indexArr.length; i += 3) {
            let point = points[indexArr[i]];
            this._graphics.moveTo(point.x + tx, point.y + ty);
            point = points[indexArr[i + 1]];
            this._graphics.lineTo(point.x + tx, point.y + ty);
            point = points[indexArr[i + 2]];
            this._graphics.lineTo(point.x + tx, point.y + ty);
            point = points[indexArr[i]];
            this._graphics.lineTo(point.x + tx, point.y + ty);
        }
        this._graphics.stroke();
    }

    /** 获取顶点 */
    private _getPoint(): void {
        if (!this._polygon == null || this._polygon.points == null) {
            return;
        }

        this._points.length = this._polygon.points.length;
        this._points = [...this._polygon.points];
    }
}