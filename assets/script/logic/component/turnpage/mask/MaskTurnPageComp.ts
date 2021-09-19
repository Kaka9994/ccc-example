
const { ccclass, property, executeInEditMode } = cc._decorator

/** 状态 */
enum TurnPageState {
    Start,
    Stop
}

/** 页根方向 */
export enum PageRootDir {
    None, // 没有页根，即页面不固定，从那边翻都可以
    Up,
    Down,
    Left,
    Right
}

const OPEN_MASK_NAME = "openMask", BCAK_MASK_NAME = "backMask", VIEW_NAME = "view"

/** 翻页组件 */
@ccclass
@executeInEditMode
export class MaskTurnPageComp extends cc.Component {
    /** 视图节点(为了确定有效区域) */
    protected _view: cc.Node = null
    /** 遮罩组件 */
    protected _openMask: ITurnPageMask = null
    protected _backMask: ITurnPageMask = null

    /** 状态 */
    protected _state: TurnPageState = TurnPageState.Stop
    /** 记录数据 */
    protected _data: MaskTurnPageCompData = null

    /** 初始位置 */
    protected _startPos: cc.Vec2 = null
    /** 移动位置 */
    protected _movePos: cc.Vec2 = null
    /** 移动方向 */
    protected _moveDir: cc.Vec2 = null
    /** 折线位置 */
    protected _linePos: cc.Vec2 = null
    /** 禁止响应触碰移动(用与阻断非法触碰移动) */
    protected _prohibitMove: boolean = false
    /** 翻动百分比(0～1，只有0、0.5、1这3个值最准确) */
    protected _turnRote: number = 0

    public onLoad() {
        if (!CC_EDITOR) {
            this._view = cc.find(VIEW_NAME, this.node)
            let openNode = cc.find(OPEN_MASK_NAME, this.node)
            this._openMask = new OpenMaskComp(openNode)
            let backNode = cc.find(BCAK_MASK_NAME, this.node)
            this._backMask = new BackMaskComp(backNode);

            [this._view.active, openNode.active, backNode.active] =
                [false, true, true]
        }
    }

    public onEnable() {
        if (CC_EDITOR) {
            this._initNode()
        }
    }

    public lateUpdate(dt) {
        if (!CC_EDITOR && this._state == TurnPageState.Start) {
            let wPos = this._view.convertToWorldSpaceAR(cc.v2(0, 0))
            this._openMask.updateViewPos(wPos)
            this._backMask.updateViewPos(wPos)
        }
    }

    /** 初始化数据 */
    public initData(data: MaskTurnPageCompData): void {
        this._data = data
    }

    /** 组件启动 */
    public startUp(): void {
        // 过滤无效数据
        if (this._data == null || this._data.spriteFrames == null ||
            this._data.spriteFrames.length < 2) {
            console.error("TurnPageComp.startUp | data error")
            return
        }
        this._state = TurnPageState.Start

        // 注册触摸监听
        this._registerTouchEvent()
    }

    /** 停止 */
    public stop(): void {
        this._state = TurnPageState.Stop

        // 注销触摸监听
        this._unRegisterTouchEvent()
    }

    /** 初始化节点 */
    protected _initNode(): void {
        const maskSize = cc.size(1000, 1000)

        // 构建遮罩初始化节点函数
        let initNodeFunc = (name: string) => {
            let maskNode = cc.find(name, this.node)
            if (maskNode == null) {
                // 添加遮罩节点
                maskNode = new cc.Node(name)
                maskNode.addComponent(cc.Mask)
                maskNode.setContentSize(maskSize)
                maskNode.anchorY = 1
                this.node.addChild(maskNode)

                // 添加视图节点
                let view = new cc.Node(VIEW_NAME)
                view.addComponent(cc.Sprite)
                maskNode.addChild(view)
            }
            maskNode.active = false
        }

        // 创建视图节点
        let viewNode = cc.find(VIEW_NAME, this.node)
        if (viewNode == null) {
            viewNode = new cc.Node(VIEW_NAME)
            viewNode.addComponent(cc.Sprite)
            this.node.addChild(viewNode)
        }

        // 创建遮罩节点
        initNodeFunc(OPEN_MASK_NAME)
        initNodeFunc(BCAK_MASK_NAME)
    }

    /** 注册触摸监听 */
    protected _registerTouchEvent(): void {
        this.node.on(cc.Node.EventType.TOUCH_START, this._onTouchStart, this)
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this)
        this.node.on(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this)
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this)
    }

    /** 注销触摸监听 */
    protected _unRegisterTouchEvent(): void {
        this.node.off(cc.Node.EventType.TOUCH_START, this._onTouchStart, this)
        this.node.off(cc.Node.EventType.TOUCH_MOVE, this._onTouchMove, this)
        this.node.off(cc.Node.EventType.TOUCH_END, this._onTouchEnd, this)
        this.node.off(cc.Node.EventType.TOUCH_CANCEL, this._onTouchEnd, this)
    }

    /** 开始触摸 */
    protected _onTouchStart(event: cc.Event.EventTouch): void {
        let pos = this.node.convertToNodeSpaceAR(event.getLocation())

        // 设置初始位置(触点与视图接触的位置)
        this._setStartPos(pos)
    }

    /** 触摸滑动 */
    protected _onTouchMove(event: cc.Event.EventTouch): void {
        // 过滤
        if (this._prohibitMove) {
            return
        }
        this._movePos = this.node.convertToNodeSpaceAR(event.getLocation())

        // 记录初始位置(触点与视图接触的位置)
        this._setStartPos(this._movePos)

        // 计算移动
        this._caleMove(event.getDelta())
    }

    /** 触摸结束 */
    protected _onTouchEnd(_: cc.Event.EventTouch): void {
        this._clear()
    }

    /** 清理 */
    protected _clear(): void {
        this._startPos = null
        this._movePos = null
        this._moveDir = null
        this._linePos = null
        this._prohibitMove = false
        this._turnRote = 0
    }

    /** 设置开始位置 */
    protected _setStartPos(pos: cc.Vec2): void {
        if (this._startPos == null &&
            this._checkPointInRect(pos, this._view.position as any, this._view.width, this._view.height)) {
            this._startPos = pos
        }
    }

    /** 计算移动 */
    protected _caleMove(dPos: cc.Vec2): void {
        // 过滤
        if (this._startPos == null || this._prohibitMove) {
            return
        }

        // 当触点在视图区域内移动了dirDis距离后开始计算滑动角度
        const dirDis = 3
        if (this._moveDir == null && this._movePos.sub(this._startPos).mag() >= dirDis) {
            // 移动方向、滑动角度
            this._moveDir = this._movePos.sub(this._startPos).normalize()
            let rotation = this.getRotation(this._moveDir)

            // 修正初始位置
            let fixPos = this._caleRayAABB(this._moveDir, this._startPos,
                this._view.getContentSize(), cc.v2(this._view.position))
            this._startPos = fixPos != null ? fixPos : this._startPos
            let halfPos = cc.v2(
                (this._startPos.x + this._movePos.x) / 2,
                (this._startPos.y + this._movePos.y) / 2
            )

            this._linePos = halfPos

            // 检测是否折线与边界触碰，触碰返回
            let borderPoints = this._getBorderPoints()
            if (borderPoints != null && this._checkBorderCollision(borderPoints)) {
                this._moveDir = null
                return
            }

            // 初始化位置和角度
            this._openMask.setPos(halfPos)
            this._backMask.setPos(halfPos)
            this._openMask.setAngle(rotation)
            this._backMask.setAngle(rotation)
        }

        // 过滤
        if (this._moveDir == null) {
            return
        }

        // 计算移动差值
        let dMove = this._moveDir.mul(this._moveDir.dot(dPos) / 2)

        // 触碰边界，修正
        let borderPoints = this._getBorderPoints()
        if (borderPoints != null) {
            let oriPos = cc.v2(this._linePos)
            let tmpDMove = cc.v2(0, 0)

            let ok = false
            let isCollision = false
            let isVerBorder = false

            do {
                // 检测碰撞
                isCollision = this._checkBorderCollision(borderPoints)

                // 修正角度
                if (isCollision && !isVerBorder) {
                    const fixAngle = 3
                    let expectDir = borderPoints[0].sub(borderPoints[1]).normalize().rotateSelf(Math.PI / 2)
                    if (this._moveDir.angle(expectDir) / Math.PI * 180 < 1) {
                        this._moveDir = expectDir
                        isVerBorder = true
                    } else {
                        this._moveDir = this._moveDir.lerp(expectDir, 0.01)
                    }

                    // 旋转
                    let newRotation = this.getRotation(this._moveDir)
                    this._openMask.setAngle(newRotation)
                    this._backMask.setAngle(newRotation)

                    // 重新计算移动差值
                    dMove = this._moveDir.mul(this._moveDir.dot(dPos) / 2);
                    [tmpDMove.x, tmpDMove.y] = [0, 0]
                }

                // 重置移动差值
                if (isVerBorder) {
                    this._linePos = oriPos
                }

                // 进行线性差值移动
                if (!isCollision) {
                    if (tmpDMove.sub(dMove).mag() < 1) {
                        tmpDMove = dMove
                    } else {
                        tmpDMove = tmpDMove.lerp(dMove, 0.01)
                    }
                    this._linePos = oriPos.add(tmpDMove)
                }

                // 退出循环
                if (isVerBorder && isCollision || tmpDMove.equals(dMove)) {
                    ok = true
                }
            }
            while (!ok)
        }

        // 移动
        this._openMask.setPos(this._linePos)
        this._backMask.setPos(this._linePos)

        // 计算翻动比例
        this._caleTurnRota()
    }

    /** 构建计算滑动角度函数 */
    protected getRotation(dir: cc.Vec2): number {
        let rotation = dir.angle(cc.v2(0, -1)) * (180 / Math.PI)
        if (dir.x < 0) {
            rotation = 360 - rotation
        }
        return rotation
    }

    /** 获取边界节点 */
    protected _getBorderPoints(): cc.Vec2[] {
        // 过滤
        if (this._data == null || this._data.pageRootDir == PageRootDir.None) {
            return null
        }

        let borderA: cc.Vec2 = null
        let borderB: cc.Vec2 = null
        switch (this._data.pageRootDir) {
            case PageRootDir.Up:
                borderA = cc.v2(this._view.x + this._view.width / 2, this._view.y + this._view.height / 2)
                borderB = cc.v2(this._view.x - this._view.width / 2, this._view.y + this._view.height / 2)
                break
            case PageRootDir.Down:
                borderA = cc.v2(this._view.x - this._view.width / 2, this._view.y - this._view.height / 2)
                borderB = cc.v2(this._view.x + this._view.width / 2, this._view.y - this._view.height / 2)
                break
            case PageRootDir.Left:
                borderA = cc.v2(this._view.x - this._view.width / 2, this._view.y + this._view.height / 2)
                borderB = cc.v2(this._view.x - this._view.width / 2, this._view.y - this._view.height / 2)
                break
            case PageRootDir.Right:
                borderA = cc.v2(this._view.x + this._view.width / 2, this._view.y - this._view.height / 2)
                borderB = cc.v2(this._view.x + this._view.width / 2, this._view.y + this._view.height / 2)
                break
        }
        return [borderA, borderB]
    }

    /** 检测折线是否触碰到限定边界 */
    protected _checkBorderCollision(borderPoints?: cc.Vec2[]): boolean {
        // 过滤
        if (this._data == null || this._data.pageRootDir == PageRootDir.None) {
            return false
        }

        if (borderPoints == null) {
            borderPoints = this._getBorderPoints()
        }

        // 检测是否是从边界滑入
        let expectDir = borderPoints[0].sub(borderPoints[1]).normalize().rotateSelf(Math.PI / 2)
        if (expectDir.dot(this._moveDir) < 0) {
            // 禁止响应触碰移动
            this._prohibitMove = true
            return true
        }

        // 检测是否已经完全翻页
        const minAngle = 1
        let angle = expectDir.angle(this._moveDir) / Math.PI * 180
        if (angle <= minAngle) {
            switch (true) {
                case (this._data.pageRootDir == PageRootDir.Left && borderPoints[0].x >= this._linePos.x):
                case (this._data.pageRootDir == PageRootDir.Right && borderPoints[0].x <= this._linePos.x):
                case (this._data.pageRootDir == PageRootDir.Up && borderPoints[0].y <= this._linePos.y):
                case (this._data.pageRootDir == PageRootDir.Down && borderPoints[0].y >= this._linePos.y):
                    // 禁止响应触碰移动
                    this._prohibitMove = true
                    return true
            }
        }

        // 射线检测
        let meetPoint = this._caleRayLine(
            this._moveDir.rotate(Math.PI / 2),
            this._linePos,
            borderPoints[0], borderPoints[1]
        )

        return meetPoint != null ? true : false
    }

    /** 计算翻动比例 */
    protected _caleTurnRota(): void {
        // 过滤
        if (this._moveDir == null) {
            return
        }

        let dir = cc.v2(this._view.position).sub(this._linePos)
        let angle = Math.abs(this._moveDir.signAngle(dir as any) / Math.PI * 180)

        // 翻动比例(并不准确，不建议使用)
        this._turnRote = angle / 180
    }

    /** 计算射线与直线触碰点 */
    protected _caleRayLine(rayDir: cc.Vec2, rayPoint: cc.Vec2,
        linePoint1: cc.Vec2, linePoint2: cc.Vec2): cc.Vec2 {

        // 直线方向
        let lineDir = linePoint1.sub(linePoint2).normalize()

        // 判断两线是否平行
        let r = rayDir.angle(lineDir) / Math.PI * 180
        if (r == 0 || r == 180) {
            return null
        }

        // 射线竖直
        if (rayDir.x == 0 &&
            ((rayPoint.x <= linePoint1.x && rayPoint.x >= linePoint2.x) ||
                (rayPoint.x <= linePoint2.x && rayPoint.x >= linePoint1.x))) {
            return cc.v2(rayPoint.x, linePoint1.y)
        }
        // 射线水平
        else if (rayDir.y == 0 &&
            ((rayPoint.y <= linePoint1.y && rayPoint.y >= linePoint2.y) ||
                (rayPoint.y <= linePoint2.y && rayPoint.y >= linePoint1.y))) {
            return cc.v2(linePoint1.x, rayPoint.y)
        }

        let rayA = (rayDir.y / rayDir.x),
            rayB = rayPoint.y - rayA * rayPoint.x,
            lineMinPoint: cc.Vec2 = null, lineMaxPoint: cc.Vec2 = null

        // 直线竖直
        if (lineDir.x == 0) {
            if (linePoint1.y < linePoint2.y) {
                [lineMinPoint, lineMaxPoint] = [linePoint1, linePoint2]
            } else {
                [lineMinPoint, lineMaxPoint] = [linePoint2, linePoint1]
            }
            let y = rayA * linePoint1.x + rayB
            if (y >= lineMinPoint.y && y <= lineMaxPoint.y) {
                return cc.v2(linePoint1.x, y)
            }
            return null
        }
        // 直线水平
        else if (lineDir.y == 0) {
            if (linePoint1.x < linePoint2.x) {
                [lineMinPoint, lineMaxPoint] = [linePoint1, linePoint2]
            } else {
                [lineMinPoint, lineMaxPoint] = [linePoint2, linePoint1]
            }
            let x = (linePoint1.y - rayB) / rayA
            if (x >= lineMinPoint.x && x <= lineMaxPoint.x) {
                return cc.v2(x, linePoint1.y)
            }
            return null
        }

        let lineA = (lineDir.y / lineDir.x),
            lineB = lineDir.y - lineA * linePoint2.x,
            pos = cc.v2(0, 0)

        pos.x = (lineB - rayB) / (rayA / lineA)
        pos.y = rayA * (lineB - rayB) / (rayA / lineA) + rayB

        if (pos.x > linePoint1.x && pos.x > linePoint2.x ||
            pos.x < linePoint1.x && pos.x < linePoint2.x ||
            pos.y > linePoint1.y && pos.y > linePoint2.y ||
            pos.y < linePoint1.y && pos.y < linePoint2.y) {
            return null
        }

        return pos
    }

    /** 计算射线与矩形框触碰点 */
    protected _caleRayAABB(rayDir: cc.Vec2, rayPoint: cc.Vec2,
        aabbSize: cc.Size, aabbPoint: cc.Vec2): cc.Vec2 {

        let upPos = this._caleRayLine(rayDir, rayPoint,
            cc.v2(aabbPoint.x - aabbSize.width / 2, aabbPoint.y + aabbSize.height / 2),
            cc.v2(aabbPoint.x + aabbSize.width / 2, aabbPoint.y + aabbSize.height / 2)
        )
        let downPos = this._caleRayLine(rayDir, rayPoint,
            cc.v2(aabbPoint.x - aabbSize.width / 2, aabbPoint.y - aabbSize.height / 2),
            cc.v2(aabbPoint.x + aabbSize.width / 2, aabbPoint.y - aabbSize.height / 2)
        )
        let leftPos = this._caleRayLine(rayDir, rayPoint,
            cc.v2(aabbPoint.x - aabbSize.width / 2, aabbPoint.y + aabbSize.height / 2),
            cc.v2(aabbPoint.x - aabbSize.width / 2, aabbPoint.y - aabbSize.height / 2)
        )
        let rightPos = this._caleRayLine(rayDir, rayPoint,
            cc.v2(aabbPoint.x + aabbSize.width / 2, aabbPoint.y + aabbSize.height / 2),
            cc.v2(aabbPoint.x + aabbSize.width / 2, aabbPoint.y - aabbSize.height / 2)
        )

        // 计算角度
        let rotation = rayDir.angle(cc.v2(1, 0)) * (180 / Math.PI)
        rotation = rayDir.y > 0 ? 360 - rotation : rotation

        switch (true) {
            // 左
            case (rotation == 0 || rotation == 360): return leftPos
            // 上
            case (rotation == 90): return upPos
            // 右
            case (rotation == 180): return rightPos
            // 下
            case (rotation == 270): return downPos
            // 上、左
            case (rotation > 0 && rotation < 90): return upPos != null ? upPos : leftPos
            // 上、右
            case (rotation > 90 && rotation < 180): return upPos != null ? upPos : rightPos
            // 下、右
            case (rotation > 180 && rotation < 270): return downPos != null ? downPos : rightPos
            // 下、左
            case (rotation > 270 && rotation < 360): return downPos != null ? downPos : leftPos
            default: return null
        }
    }

    /** 检测点是否在矩形框内 */
    protected _checkPointInRect(point: cc.Vec2, rectCenter: cc.Vec2, width: number, height: number): boolean {
        if ((point.x >= rectCenter.x - width / 2 && point.x <= rectCenter.x + width / 2) &&
            point.y >= rectCenter.y - height / 2 && point.y <= rectCenter.y + height / 2) {
            return true
        }
        return false
    }
}

/** 翻页数据 */
export class MaskTurnPageCompData {
    public spriteFrames: cc.SpriteFrame[] = [];
    public pageRootDir: PageRootDir = PageRootDir.Right
}

/** 翻页遮罩组件接口 */
interface ITurnPageMask {
    /** 获取节点 */
    getRoot(): cc.Node
    /** 设置位置 */
    setPos(pos: cc.Vec2): void
    /** 设置旋转角度 */
    setAngle(angle: number): void
    /** 移动 */
    move(dPos: cc.Vec2): void
    /** 更新视图坐标 */
    updateViewPos(wPos: cc.Vec2): void
}

/** 正面遮罩组件 */
class OpenMaskComp implements ITurnPageMask {
    /** 遮罩节点 */
    private _root: cc.Node = null
    /** 正面视图 */
    private _view: cc.Node = null

    constructor(root: cc.Node) {
        this._root = root
        this._view = cc.find(VIEW_NAME, this._root)
    }

    public getRoot(): cc.Node {
        return this._root
    }

    public setPos(pos: cc.Vec2): void {
        this._root.setPosition(pos)
    }

    public setAngle(angle: number): void {
        this._root.angle = angle
        this._view.angle = -angle
    }

    public move(dPos: cc.Vec2): void {
        this._root.x += dPos.x
        this._root.y += dPos.y
    }

    public updateViewPos(wPos: cc.Vec2): void {
        let lPos = this._root.convertToNodeSpaceAR(wPos);
        [this._view.x, this._view.y] = [lPos.x, lPos.y]
    }
}

/** 背面遮罩组件 */
class BackMaskComp implements ITurnPageMask {
    /** 遮罩节点 */
    private _root: cc.Node = null
    /** 背面视图 */
    private _view: cc.Node = null

    constructor(root: cc.Node) {
        this._root = root
        this._view = cc.find(VIEW_NAME, this._root)
    }

    public getRoot(): cc.Node {
        return this._root
    }

    public setPos(pos: cc.Vec2): void {
        this._root.setPosition(pos)
    }

    public setAngle(angle: number): void {
        this._root.angle = angle
        this._view.angle = 180 + angle
    }

    public move(dPos: cc.Vec2): void {
        this._root.x += dPos.x
        this._root.y += dPos.y
    }

    public updateViewPos(wPos: cc.Vec2): void {
        // 世界数据
        let wMinePos = this._root.convertToWorldSpaceAR(cc.v2(0, 0)),
            dir = cc.v2(1, 0).rotate((this._root.angle * Math.PI / 180)),
            lineEndPos = wMinePos.add(dir.mul(100)),
            dis = cc.Intersection.pointLineDistance(wPos, wMinePos, lineEndPos, false)

        // 本地位置
        let lPos = this._root.convertToNodeSpaceAR(wPos),
            isPointUp = (lPos.x == 0 || lPos.y == 0) ?
                true : (lPos.signAngle(cc.v2(1, 0)) > 0 ? true : false)

        dir = dir.rotate((90 - this._root.angle) * Math.PI / 180)
        let pos = lPos.add(dir.mul(dis *= isPointUp ? 2 : -2));

        [this._view.x, this._view.y] = [pos.x, pos.y]

        // TODO:阴影
    }
}