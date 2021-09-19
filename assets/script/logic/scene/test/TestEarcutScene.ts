import earcut from "../../../bin/earcut"
import { getNodeOrComponent } from "../../utils/NodeUtil";

const { ccclass, property, executeInEditMode } = cc._decorator;

/** 绘制间隔时间 */
const LimiTime = 0.03

/** 测试分割三角形场景 */
@ccclass
@executeInEditMode
export default class TestEarcutScene extends cc.Component {
    /** 多边形组件 */
    private _polygon: cc.PolygonCollider = null
    /** 顶点 */
    private _points: cc.Vec2[] = []
    /** 测试绘制组件 */
    private _graphics: cc.Graphics = null
    /** 测试绘制时间 */ 
    private _updateTime: number = 0

    public onEnable(): void {
        this._bindProps()
    }

    public update(dt): void {
        this._updateTime += dt
        if (this._updateTime > LimiTime) {
            this._updateTime = 0
            this._getPoint()
            this._draw(this._points)
        }
    }

    /** 绑定属性 */
    private _bindProps(): void {
        // 多边形组件
        this._polygon = getNodeOrComponent(this.node, "n_polygon", cc.PolygonCollider, true)
        // 辅助绘制节点
        this._graphics = getNodeOrComponent(this.node, "graphic_text", cc.Graphics, true)
    }

    /** 绘制 */
    private _draw(points: cc.Vec2[]): void {
        // 过滤无效参数
        if (this._graphics == null) {
            return
        }

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
        if (this._polygon == null || this._polygon.points == null) {
            return;
        }

        this._points.length = this._polygon.points.length;
        this._points = [...this._polygon.points];
    }
}