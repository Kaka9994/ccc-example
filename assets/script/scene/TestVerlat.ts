import TurnPageRender from "../render/turnpage/TurnPageRender";


const { ccclass, property, executeInEditMode } = cc._decorator;

/** 翻页质点(verlet积分算法可以通过前2个点计算下一个点的位置) */
class PagePoint {
    public newP: cc.Vec2 = null;
    public oldP: cc.Vec2 = null;
    constructor(p1: cc.Vec2, p2: cc.Vec2) {
        [this.newP, this.oldP] = [p1, p2];
    }
}

@ccclass
@executeInEditMode
export default class TestVerlat extends cc.Component {

    /** 页面视图(用来确定位置，单页) */
    private _pageView: cc.Node = null;
    /** 自定义翻页渲染组件 */
    private _turnRender: TurnPageRender = null;
    /** 质点集合([0]点为页根，固定点) */
    private _points: PagePoint[] = [];
    /** 模拟重力值 */
    private _gravity: number = -0.6;
    /** 速度衰减值 */
    private _damping: number = 0.5;
    /** 角度 */
    private _angle: number = 0;
    /** pageView 4条边的本地坐标 */
    private _local: number[] = [0, 0, 0, 0];

    private _tw: cc.Tween = null;
    private _stop: boolean = false;

    // 测试绘制用
    private _graphics: cc.Graphics = null;

    public onLoad(): void {
        window["lala1"] = () => {
            if (this._tw != null) {
                this._tw.stop();
                this._tw = null;
            }
            this._stop = false;
            this._angle = 0;
            this._initPoints();

            this._tw = cc.tween(<any>this)
                .to(0.5, { _angle: 180 }, { easing: "quadOut" })
                .delay(1)
                .call(() => {
                    this._stop = true;
                })
                .start();
        }
        window["lala2"] = () => {
            if (this._tw != null) {
                this._tw.stop();
                this._tw = null;
            }
            this._stop = false;
            this._angle = 180;
            this._initPoints(false);

            this._tw = cc.tween(<any>this)
                .to(0.5, { _angle: 0 }, { easing: "quadOut" })
                .delay(1)
                .call(() => {
                    this._stop = true;
                })
                .start();
        }
    }

    public onEnable(): void {
        this._bindProps();
        this._initPoints();
    }

    public start(): void {
    }

    public update(dt): void {
        if (this._stop) {
            return;
        }
        this._doCalePointsByVerlat();
        this._doFixPoints();
        this._turnRender.updatePage(this._getPointsPosList());
    }

    /** 绑定属性 */
    private _bindProps(): void {
        this._pageView = cc.find("pageView", this.node);
        this._turnRender = cc.find("turnRender", this.node).getComponent(TurnPageRender);
        this._graphics = cc.find("graphics", this.node).getComponent(cc.Graphics);
        this._local = [
            - this._pageView.width * this._pageView.anchorX,  // l
            - this._pageView.height * this._pageView.anchorY, // b
            this._pageView.width - this._pageView.width * this._pageView.anchorX,   // r
            this._pageView.height - this._pageView.height * this._pageView.anchorY, // t
        ];

        // 更新tx、ty
        let matrix = new cc.Mat4();
        this._pageView.getWorldMatrix(matrix);
        this._turnRender.updateTxTy(matrix["m12"], matrix["m13"]);
    }

    /** 初始化质点 */
    private _initPoints(front: boolean = true): void {
        // 过滤
        if (this._pageView == null) {
            return;
        }

        let count = this._turnRender.triangleNum / 2 + 1,
            w = this._pageView.width,
            l = this._local[0], b = this._local[1],
            dx = w / (count - 1);

        this._points.length = 0;
        for (let i = 0; i < count; i++) {
            let x0 = l + i * dx * (front ? 1 : -1);
            this._points[i] = new PagePoint(cc.v2(x0, b), cc.v2(x0, b));
        }
    }

    /** 获取点位置 */
    private _getPointsPosList(): cc.Vec2[] {
        let posList: cc.Vec2[] = [];
        for (let i = 0, count = this._points.length; i < count; i++) {
            posList.push(this._points[i].newP);
        }
        return posList;
    }

    /** 移动末尾质点 */
    private _doRunEndPoint(): void {
        // 过滤
        let count = this._points.length;
        if (count <= 0 || this._pageView == null) {
            return;
        }

        const h = 150;
        let w2 = this._pageView.width * 2,
            point = this._points[count - 1];
        point.newP.x = this._local[2] - this._angle / 180 * w2;
        point.newP.y = this._local[1] + Math.sin(Math.PI / 180 * this._angle) * h;
    }

    /** 通过verlat算法计算质点位置 */
    private _doCalePointsByVerlat(): void {
        // 过滤
        let count = this._points.length;
        if (count <= 0) {
            return;
        }

        // verlat公式，略去了小项
        // 将dt记为单位值，粗略记为新位置与旧位置的差值
        // 加速度可以记为(重力 + 阻力) / 质量 = 重力加速度 + 速度衰减
        // 速度衰减可以表现为为在原有速度上乘一个衰减值
        // x(t + dt) = 2 * x(t) - x(t - dt) + a(t) * dt^2
        //           = x(t) + (x(t) - x(t - dt)) + a(t) * dt^2
        //           = x(t) + v(t) + a(t)

        // 重力加速度
        let gravity = cc.v2(0, this._gravity);

        for (let i = count - 2; i > 0; i--) {
            let point = this._points[i];
            if (point != null) {
                // 计算速度，再乘上衰减值
                let velocity = point.newP.sub(point.oldP).mul(this._damping);

                // 与底边接触时加速度为0
                gravity.y = point.newP.y <= this._local[1] ? 0 : this._gravity;

                [point.oldP.x, point.oldP.y] = [point.newP.x, point.newP.y];
                point.newP = point.newP.addSelf(velocity).addSelf(gravity);
            }
        }
    }

    /** 修正质点位置(约束两质点间距离) */
    private _doFixPoints(): void {
        // 过滤
        let count = this._points.length;
        if (count <= 0 || this._pageView == null) {
            return;
        }

        const fixCount = 100;
        let norDx = this._pageView.width / (count - 1);
        for (let i = 0; i < fixCount; i++) {
            this._doRunEndPoint();
            for (let j = count - 1; j > 0; j--) {
                let p1 = this._points[j - 1].newP,
                    p2 = this._points[j].newP,
                    dir = p2.sub(p1),
                    newDx = dir.mag(),
                    dis = newDx - norDx;

                // 归一化方向
                dir.normalizeSelf();

                // 纠正方向
                dir.mulSelf(dis * 0.5);

                // 页根保持不变
                if (j == 1) {
                    p2.subSelf(dir.mulSelf(2));
                } else {
                    p1.addSelf(dir);
                    p2.subSelf(dir);
                }
            }
        }
    }

    /** 绘制 */
    private _doDraw(): void {
        this._graphics.clear();
        for (let i = 0; i < this._points.length; i++) {
            let point = this._points[i];
            if (i == 0) {
                this._graphics.moveTo(point.newP.x, point.newP.y);
            } else {
                this._graphics.lineTo(point.newP.x, point.newP.y);
            }
        }
        this._graphics.stroke();
    }
}
