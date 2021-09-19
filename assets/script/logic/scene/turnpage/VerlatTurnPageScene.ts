import * as fbase from "../../../framework/core/base/pkg_base"
import * as fload from "../../../framework/core/loader/pkg_loader"
import * as floadmgr from "../../../framework/manager/load/pkg_loadmgr"
import TurnPageRenderComp from "../../component/turnpage/vertex/TurnPageRenderComp"
import { getNodeOrComponent } from "../../utils/NodeUtil"
import { usingFramework } from "../boot/BootScene"


const { ccclass, property, executeInEditMode } = cc._decorator

/** 翻页质点(verlet积分算法可以通过前2个点计算下一个点的位置) */
class PagePoint {
    /** 质点当前位置 */
    public newP: cc.Vec2 = null
    /** 质点上一个位置 */
    public oldP: cc.Vec2 = null
    constructor(p1: cc.Vec2, p2: cc.Vec2) {
        [this.newP, this.oldP] = [p1, p2]
    }
}

/** 质点模拟翻页场景 */
@ccclass
@executeInEditMode
@usingFramework
export default class VerlatTurnPageScene extends cc.Component {
    /** 页面视图(用来确定位置，单页) */
    private _pageView: cc.Node = null
    /** 自定义翻页渲染组件 */
    private _turnComp: TurnPageRenderComp = null
    /** 质点集合([0]点为页根，固定点) */
    private _points: PagePoint[] = []
    /** 模拟重力值 */
    private _gravity: number = -0.6
    /** 速度衰减值 */
    private _damping: number = 0.5
    /** 角度 */
    private _angle: number = 0
    /** pageView 4条边的本地坐标 */
    private _local: number[] = [0, 0, 0, 0]
    /** 自动缓存管理 */
    private _autoCache: fload.AutoCache = new fload.AutoCache()
    /** 测试绘制组件 */
    private _graphics: cc.Graphics = null
    /** tween动画 */
    private _tw: cc.Tween = null
    /** 停止计算标志 */
    private _stop: boolean = false
    /** 触摸开始点x坐标 */
    private _touchX: number = null
    /** 触发翻页的最小移动范围 */
    private _minTouchX: number = 20

    public onEnable(): void {
        this._bindProps()
        this._initPoints()
    }

    public update(dt): void {
        // 过滤
        if (this._stop) {
            return
        }

        this._doRunEndPoint()
        this._doCalePointsByVerlat()
        this._doFixPoints()
        this._doDraw()
        this._turnComp.updatePage(this._getPointsPosList())
    }

    public onDestroy(): void {
        this._autoCache.clean()
    }

    /** 绑定属性 */
    private _bindProps(): void {
        // 页面视图节点
        this._pageView = getNodeOrComponent(this.node, "n_pageView", null, true)
        // 翻页节点
        this._turnComp = getNodeOrComponent(this.node, "tp_render", TurnPageRenderComp, true)
        // 翻页节点
        this._graphics = getNodeOrComponent(this.node, "graphic_text", cc.Graphics, true)

        // 添加监听
        this._addEvent()

        // 加载材质
        let material = this._turnComp.getMaterial(0)
        if (material.name.indexOf("turnpage") == -1) {
            let url = floadmgr.CCC_RES + "resources/materials/turnpage.mtl"
            floadmgr.LoadManager.me.load(url,
                null,
                (info: { [url: string]: string }) => {
                    if (info[url] != null) {
                        fbase.logger.error("_bindProps:材质加载失败|", info[url])
                        return
                    }

                    // 设置材质
                    let cache = this._autoCache.getRes(url),
                        material: cc.Material = cache.getData()
                    if (material != null) {
                        this._turnComp.setMaterial(0, material)
                    }
                },
            )
        }

        // 初始化本地坐标
        this._local = [
            - this._pageView.width * this._pageView.anchorX,  // l
            - this._pageView.height * this._pageView.anchorY, // b
            this._pageView.width - this._pageView.width * this._pageView.anchorX,   // r
            this._pageView.height - this._pageView.height * this._pageView.anchorY, // t
        ]

        // 更新tx、ty
        let matrix = new cc.Mat4()
        this._pageView.getWorldMatrix(matrix)
        this._turnComp.updateTxTy(matrix["m12"], matrix["m13"])
    }

    /** 初始化质点 */
    private _initPoints(front: boolean = true): void {
        // 过滤
        if (this._pageView == null) {
            return
        }

        // 计算数量和间隔
        let count = this._turnComp.pointsNum / 2 + 1,
            w = this._pageView.width,
            l = this._local[0], b = this._local[1],
            dx = w / (count - 1)

        // 初始化
        this._points.length = 0
        for (let i = 0; i < count; i++) {
            let x0 = l + i * dx * (front ? 1 : -1)
            this._points[i] = new PagePoint(cc.v2(x0, b), cc.v2(x0, b))
        }
    }

    /** 添加监听 */
    private _addEvent(): void {
        // 监听pageView位置和尺寸改变
        if (this._pageView != null) {
            this._pageView.off(cc.Node.EventType.POSITION_CHANGED)
            this._pageView.on(cc.Node.EventType.POSITION_CHANGED, this._onBindPageViewToTurnComp, this)
        }

        // 监听触摸
        this.node.off(cc.Node.EventType.TOUCH_START, this._onTouchStart, this)
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this)
        this.node.on(cc.Node.EventType.TOUCH_START, this._onTouchStart, this)
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this)
    }

    /** 同步pageView节点和turnComp节点的尺寸和位置 */
    private _onBindPageViewToTurnComp(): void {
        // 更新turnComp节点位置
        if (this._turnComp != null && this._turnComp.node.isValid) {
            // 同步位置和尺寸
            let n1 = this._turnComp.node, n2 = this._pageView;
            [n1.x, n1.y, n1.width, n1.height] = [n2.x, n2.y, n2.width, n2.height]

            // 更新tx、ty
            let matrix = new cc.Mat4()
            this._pageView.getWorldMatrix(matrix)
            this._turnComp.updateTxTy(matrix["m12"], matrix["m13"])

            // 更新节点
            // @ts-ignore
            this._turnComp.setVertsDirty()
        }

        // 更新绘制节点位置
        if (this._graphics != null && this._graphics.node.isValid) {
            // 同步位置
            let n1 = this._graphics.node, n2 = this._pageView;
            [n1.x, n1.y] = [n2.x, n2.y - 10]
        }
    }

    /**
     * 触摸开始回调
     * @param evt 触摸事件
     */
    private _onTouchStart(evt: cc.Event.EventTouch): void {
        this._touchX = evt.getLocationX()
    }

    /**
     * 触摸移动回调
     * @param evt 触摸事件
     */
    private _onTouchMove(evt: cc.Event.EventTouch): void {
        // 过滤
        if (this._touchX == null) {
            return
        }

        // 触发移动
        let dis = this._touchX - evt.getLocationX()
        if (this._minTouchX <= Math.abs(dis)) {
            this._touchX = null
            this._doMoveByDir(dis)
        }
    }

    /**
     * 触发左右翻译动作
     * @param dir 翻页方向(<0:右翻，>0:左翻)
     */
    private _doMoveByDir(dir: number): void {
        // 停止上一个翻页动画
        if (this._tw != null) {
            this._tw.stop()
            this._tw = null
        }

        // 重置数据
        this._stop = false
        this._angle = dir > 0 ? 0 : 180
        let targetAngle = dir < 0 ? 0 : 180
        this._initPoints(dir > 0)

        // 启动动画
        this._tw = cc.tween(<any>this)
            .to(0.5, { _angle: targetAngle }, { easing: "quadOut" })
            .delay(1)
            .call(() => {
                this._stop = true;
            })
            .start()
    }

    /** 获取点位置 */
    private _getPointsPosList(): cc.Vec2[] {
        let posList: cc.Vec2[] = []
        for (let i = 0, count = this._points.length; i < count; i++) {
            posList.push(this._points[i].newP)
        }
        return posList
    }

    /** 移动末尾质点 */
    private _doRunEndPoint(): void {
        // 过滤
        let count = this._points.length
        if (count <= 0 || this._pageView == null) {
            return
        }

        // 正弦曲线运动
        const h = 150
        let w2 = this._pageView.width * 2,
            point = this._points[count - 1]
        point.newP.x = this._local[2] - this._angle / 180 * w2
        point.newP.y = this._local[1] + Math.sin(Math.PI / 180 * this._angle) * h
    }

    /** 通过verlat算法计算质点位置 */
    private _doCalePointsByVerlat(): void {
        // 过滤
        let count = this._points.length
        if (count <= 0) {
            return
        }

        // verlat公式，略去了小项
        // 将dt记为单位值，粗略记为新位置与旧位置的差值
        // 加速度可以记为(重力 + 阻力) / 质量 = 重力加速度 + 速度衰减
        // 速度衰减可以表现为为在原有速度上乘一个衰减值
        // x(t + dt) = 2 * x(t) - x(t - dt) + a(t) * dt^2
        //           = x(t) + (x(t) - x(t - dt)) + a(t) * dt^2
        //           = x(t) + v(t) + a(t)

        // 重力加速度
        let gravity = cc.v2(0, this._gravity)

        for (let i = count - 2; i > 0; i--) {
            let point = this._points[i]
            if (point != null) {
                // 计算速度，再乘上衰减值
                let velocity = point.newP.sub(point.oldP).mul(this._damping)

                // 与底边接触时加速度为0
                gravity.y = point.newP.y <= this._local[1] ? 0 : this._gravity;

                // 更新下一个时间的位置
                [point.oldP.x, point.oldP.y] = [point.newP.x, point.newP.y]
                point.newP = point.newP.addSelf(velocity).addSelf(gravity)
            }
        }
    }

    /** 修正质点位置(约束两质点间距离) */
    private _doFixPoints(): void {
        // 过滤
        let count = this._points.length
        if (count <= 0 || this._pageView == null) {
            return
        }

        // 修正次数
        const fixCount = 100
        // 放平状态下质点间距
        let norDis = this._pageView.width / (count - 1)
        // 记录末尾质点位置
        let endPoint = this._points[count - 1],
            endPointX = endPoint.newP.x,
            endPointY = endPoint.newP.y

        for (let i = 0; i < fixCount; i++) {
            // 重置末尾字典
            [endPoint.newP.x, endPoint.newP.y] = [endPointX, endPointY]

            // 从末尾开始修正
            // 因为纸张不可拉伸，所以质点间距离最大值是norDis
            // 当距离大于norDis时，两质点向对方靠拢修正
            for (let j = count - 1; j > 0; j--) {
                let p1 = this._points[j - 1].newP,
                    p2 = this._points[j].newP,
                    dir = p2.sub(p1),
                    newDx = dir.mag(),
                    dis = newDx - norDis;

                // 归一化方向
                dir.normalizeSelf()

                // 纠正方向
                dir.mulSelf(dis * 0.5)

                // 页根保持不变
                if (j == 1) {
                    p2.subSelf(dir.mulSelf(2))
                } else {
                    p1.addSelf(dir)
                    p2.subSelf(dir)
                }
            }
        }
    }

    /** 绘制 */
    private _doDraw(): void {
        // 过滤无效参数
        if (this._graphics == null) {
            return
        }

        this._graphics.clear()
        for (let i = 0; i < this._points.length; i++) {
            let point = this._points[i]
            if (i == 0) {
                this._graphics.moveTo(point.newP.x, point.newP.y)
            } else {
                this._graphics.lineTo(point.newP.x, point.newP.y)
            }
        }
        this._graphics.stroke()
    }
}
