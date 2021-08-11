import BezierTest from "../tool/BezierTest";
import TurnPageRender from "../render/turnpage/TurnPageRender";

const { ccclass, property, executeInEditMode } = cc._decorator;


const LimiTime = 0.03;

@ccclass
@executeInEditMode
export default class TestBezier extends cc.Component {

    /** 页面视图(用来确定位置，单页) */
    private _pageView: cc.Node = null;
    /** 自定义翻页渲染组件 */
    private _turnRender: TurnPageRender = null;
    /** 贝塞尔工具 */
    private _bezierTool: BezierTest = null;
    /** 贝塞尔控制点 */
    private _bezierCPs: cc.Vec2[] = [];
    /** pageView 4条边的本地坐标 */
    private _local: number[] = [0, 0, 0, 0];

    // 测试绘制用
    private _updateTime: number = 0;
    private _graphics: cc.Graphics = null;

    // onLoad () {}

    start() {
        this._bindProps();
        this._initBezierCP();

        window["kaka"] = this._doMove.bind(this);
    }

    update(dt) {
        this._updateTime += dt;
        if (this._updateTime > LimiTime) {
            this._updateTime = 0;
            this._updateCPs();
            this._doUpdateBezier();
        }
    }

    /** 绑定属性 */
    private _bindProps(): void {
        this._pageView = cc.find("pageView", this.node);
        this._turnRender = cc.find("turnRender", this.node).getComponent(TurnPageRender);
        this._bezierTool = new BezierTest();
        this._bezierCPs = [cc.v2(), cc.v2(), cc.v2(), cc.v2()];
        this._graphics = cc.find("graphics", this.node).getComponent(cc.Graphics);
        this._local = [
            this._pageView.x - this._pageView.width * this._pageView.anchorX,  // l
            this._pageView.y - this._pageView.height * this._pageView.anchorY, // b
            this._pageView.x + this._pageView.width * this._pageView.anchorX,  // r
            this._pageView.y + this._pageView.height * this._pageView.anchorY, // t
        ];

        // 更新tx、ty
        let matrix = new cc.Mat4();
        this.node.getWorldMatrix(matrix);
        this._turnRender.updateTxTy(matrix["m12"], matrix["m13"]);
    }

    /** 初始化贝塞尔控制点 */
    private _initBezierCP(): void {
        let p0 = cc.find("p0", this.node), p1 = cc.find("p1", this.node),
            p2 = cc.find("p2", this.node), p3 = cc.find("p3", this.node),
            nodeList = [p0, p1, p2, p3],
            dx = (this._local[2] - this._local[0]) / 3;
        for (let i = 0, count = this._bezierCPs.length; i < count; i++) {
            [nodeList[i].x, nodeList[i].y] = [this._local[0] + i * dx, this._local[1]];
            [this._bezierCPs[i].x, this._bezierCPs[i].y] = [this._local[0] + i * dx, this._local[1]];
        }
    }

    private _doMove(): void {
        // TODO
        let data = {

        }
    }

    /** 更新贝塞尔曲线 */
    private _doUpdateBezier(): void {
        let bPoints: cc.Vec2[] = [],
            lPoints: cc.Vec2[] = [],
            num = this._turnRender.triangleNum / 2,
            t = 1 / num;

        let len = 0, d = 0;
        lPoints.push(cc.v2(this._bezierCPs[0].x, this._bezierCPs[0].y));

        for (let i = 0; i <= num; i++) {
            // 直线上的点
            d = this._bezierTool.lengthOnCubicBezier(this._bezierCPs, t * i, t);
            lPoints.push(cc.v2(
                lPoints[lPoints.length - 1].x + d,
                lPoints[lPoints.length - 1].y
            ));

            // 曲线上的点
            let point = this._bezierTool.pointOnCubicBezier(this._bezierCPs, t * i);
            bPoints.push(point);

            len += d;
        }

        this._turnRender.updatePage(bPoints);

        // 绘制
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
    }

    private _updateCPs(): void {
        let p0 = cc.find("p0", this.node), p1 = cc.find("p1", this.node),
            p2 = cc.find("p2", this.node), p3 = cc.find("p3", this.node),
            list = [p0, p1, p2, p3];

        for (let i = 0, count = this._bezierCPs.length; i < count; i++) {
            [this._bezierCPs[i].x, this._bezierCPs[i].y] = [list[i].x, list[i].y];
        }
    }
}