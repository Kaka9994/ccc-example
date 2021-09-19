import * as fbase from "../../../framework/core/base/pkg_base"
import * as fcommon from "../../../framework/core/common/pkg_common"
import * as futils from "../../../framework/core/utils/pkg_utils"
import * as frendermgr from "../../../framework/manager/render/pkg_rendermgr"
import Global from "../../utils/Global"
import { getNodeOrComponent } from "../../utils/NodeUtil"
import { ScrollItem } from "./ScrollItem"
import { ScrollGeneratorType } from "./ScrollType"

const Scroll_Name = "Scroll_List_Base"

const { ccclass, requireComponent, executeInEditMode, property } = cc._decorator

/** 基础滑动列表组件(单向滑动) */
@ccclass
@executeInEditMode
@requireComponent(cc.ScrollView)
export class ScrollListBaseComp extends cc.Component implements fcommon.IRender, fcommon.IDispose {
    @property({ tooltip: "初始化节点" })
    public set nodeInit(_: boolean) {
        this.bindProps()
    }
    public get nodeInit(): boolean {
        return false
    }

    /** 是否是横向排布 */
    @property
    private _isHorizontal: boolean = false
    @property({ tooltip: "是否是横向排布" })
    public set isHorizontal(v: boolean) {
        this._isHorizontal = v
        this.setLimitDir()
    }
    public get isHorizontal(): boolean {
        return this._isHorizontal
    }

    /** item间隔 */
    @property
    private _spacing: number = 0
    @property({ tooltip: "item间隔" })
    public set spacing(v: number) {
        this._spacing = v
        this.setListInfo()
    }
    public get spacing(): number {
        return this._spacing
    }

    /** 第一个item与容器邻边的间距(若为horizontal模式等同与paddingTop，反之为paddingLeft) */
    @property
    private _paddingF: number = 0
    @property({ tooltip: "第一个item与容器邻边的间距(若为horizontal模式等同与paddingTop，反之为paddingLeft)" })
    public set paddingF(v: number) {
        this._paddingF = v
        this.setListInfo()
    }
    public get paddingF(): number {
        return this._paddingF
    }

    /** 最后一个item与容器邻边的间距(若为horizontal模式等同与paddingBottom，反之为paddingRight) */
    @property
    private _paddingE: number = 0
    @property({ tooltip: "最后一个item与容器邻边的间距(若为horizontal模式等同与paddingBottom，反之为paddingRight)" })
    public set paddingE(v: number) {
        this._paddingE = v
        this.setListInfo()
    }
    public get paddingE(): number {
        return this._paddingE
    }

    /** 滑窗组件 */
    protected sv: cc.ScrollView = null
    /** 遮罩节点 */
    protected mask: cc.Node = null
    /** 容器节点content */
    protected cn: cc.Node = null
    /** 列表节点 */
    protected list: cc.Node = null
    /** 设置item的回调(设置成功返回cc.Node节点，反正失败返回null) */
    protected setItemFunc: (item: ScrollItem) => cc.Node = null
    /** item数组 */
    protected items: ScrollItem[] = null
    /** 对象池 */
    protected itemPool: fcommon.ObjectPool<ScrollItem> = null
    /** 滑窗状态 */
    protected isOpen: boolean = false
    /** 渲染item中 */
    protected isRendering: boolean = false
    /** 渲染协程对象 */
    protected renderGenerator: Generator<ScrollGeneratorType> = null
    /** 额外补充的可视距离(一半) */
    protected halfAddDis: number = 30

    /** 记录错误item数组 */
    private _errorItems: ScrollItem[] = null
    /** 记录需要渲染的item数组(按item的index属性从小到大排序) */
    private _needRenderItems: ScrollItem[] = null
    /** 记录渲染完毕的item数组(按item的index属性从小到大排序) */
    private _hadRenderItems: ScrollItem[] = null

    /** ccc销毁回调 */
    public onDestroy(): void {
        this.dispose()
    }

    /**
     * 渲染
     * @param t 当前时间(时间戳)
     * @param dt 间隔时间ms
     */
    public render(t: number, dt: number): void {
        // 渲染item
        this.renderItem(dt)
        // 清理出错节点
        this.clearErrorItem()
    }

    /**
     * 销毁，会销毁滑窗及其下的所有节点
     * (包括列表下的item节点，若想保留item节点，自行获取item，且先调用clear再调用dispose)
     */
    public dispose(): void {
        this.node.isValid && this.node.destroy()
        this.setItemFunc = null
        this.isOpen = false
        this.isRendering = false
        if (this.items != null) {
            this.items.forEach((item) => {
                if (this.itemPool != null) {
                    this.itemPool.put(item)
                } else {
                    item.dispose()
                }
            })
            this.items.length = 0
        }
        if (this._errorItems != null) {
            this._errorItems.length = 0
        }
        if (this._needRenderItems != null) {
            this._needRenderItems.length = 0
        }
        if (this._hadRenderItems != null) {
            this._hadRenderItems.length = 0
        }
        if (this.itemPool != null) {
            this.itemPool.dispose()
            this.itemPool = null
        }
        if (this.renderGenerator != null) {
            this.renderGenerator.return(ScrollGeneratorType.DONE)
            this.renderGenerator = null
        }
    }

    /**
     * 初始化(使用列表前需要调用一次)
     * @param setItemFunc 设置item的回调(根据入参item的node属性决定是否需要自行创建节点)
     *                    (设置成功返回cc.Node节点，反正失败返回null)
     * @param halfAddDis 额外补充的可视距离(一半)(一般设置为滑窗滑动方向上item节点的尺寸最大值)
     */
    public init(setItemFunc: (item: ScrollItem) => cc.Node, halfAddDis: number, ...args: any[]): void {
        // 过滤无效参数
        if (this.isOpen || this.node.parent == null) {
            fbase.logger.error("init:过滤无效参数")
            return
        }

        // 绑定回调
        this.setItemFunc = setItemFunc

        // 绑定属性
        this.bindProps()

        // 设置滑动限制方向
        this.setLimitDir()

        // 设置列表信息
        this.setListInfo()

        // 添加监听
        this.addListen()

        // 绑定额外补充的可视距离
        this.halfAddDis = halfAddDis

        // 创建对象池
        let r = fcommon.getRound(Scroll_Name)
        this.itemPool = fcommon.store.createPool(Scroll_Name + r, ScrollItem)
        this.itemPool["unuse"] = function (obj: ScrollItem, ...args) {
            obj != null && obj.recover()
        }
        this.itemPool["reuse"] = function (obj: ScrollItem, ...args) {
            let [n, i, d] = [...args]
            obj != null && obj.setTo(n, i, d)
        }

        // 添加到UI渲染中
        if (Global.me.rendermgr != null) {
            Global.me.rendermgr.addToRender(this, frendermgr.RenderType.UI)
        }

        // 激活
        this.isOpen = true
    }

    /**
     * 初始化列表数据
     * (若想多次初始化，需要事先调用clean清理列表节点)
     * (提供两种初始化方式,1:传入节点数组;2.传入节点数据数组)
     * @param nodesOrDatas 节点数组或节点数据数组
     */
    public initList(nodesOrDatas: any[]): void {
        // 过滤无效参数
        if (!this.isOpen || nodesOrDatas == null || nodesOrDatas.length <= 0 ||
            this.items != null && this.items.length > 0) {
            fbase.logger.error("initList:过滤无效参数")
            return
        }

        // 构造items
        this.items = nodesOrDatas.map((value: any, i: number) => {
            let n: cc.Node = value instanceof cc.Node ? value : null,
                d = n == null ? value : null,
                item = this.itemPool.get(n, i, d)
            item.setActive(true)
            return item
        })

        // 记录需要渲染的items
        this._needRenderItems = [].concat(this.items)
    }

    /**
     * 插入一个item
     * @param nodeOrData 节点或节点数据
     * @param index 索引,插入的位置(默认null，添加到末尾)
     */
    public insertItem(nodeOrData: any, index: number = null): void {
        // 过滤无效参数
        if (!this.isOpen || nodeOrData == null) {
            fbase.logger.error("insertItem:过滤无效参数")
            return
        }

        if (this.items == null) {
            this.items = []
        }

        // 限制索引
        index = futils.limitNumber(typeof index === "number" ? index : this.items.length, 0, this.items.length)

        // 创建item
        let n: cc.Node = nodeOrData instanceof cc.Node ? nodeOrData : null,
            d = n == null ? nodeOrData : null,
            item = this.itemPool.get(n, index, d)
        item.setActive(true)

        // 插入到items中
        this.items = this.insertItemToItemArr(item, this.items, true)

        // 记录需要渲染的items
        this._needRenderItems = this.insertItemToItemArr(item, this._needRenderItems, false)
    }

    /**
     * 删除一个item
     * @param index 索引,删除的位置
     */
    public deleteItem(index: number): cc.Node {
        // 过滤无效参数
        if (!this.isOpen || this.items == null || typeof index !== "number" ||
            index <= -1 || this.items.length <= index) {
            fbase.logger.error("deleteItem:过滤无效参数")
            return null
        }

        // 从需要渲染的items中删除
        this.deletItemToArr(index, this._needRenderItems, false)

        // 从渲染完成的items中删除
        this.deletItemToArr(index, this._hadRenderItems, false)

        // 从items中删除
        let item = this.deletItemToArr(index, this.items, true)

        if (item != null) {
            let n = item.node

            // 从list节点上移除
            n != null && n.parent != null && n.removeFromParent()

            // 回收item
            this.itemPool.put(item)

            return n
        }

        return null
    }

    /**
     * 更新item
     * @param nodeOrData 节点或节点数据
     * @param index 索引,更新的位置(默认null，添加到末尾)
     */
    public updateItem(nodeOrData: any, index: number = null): void {
        // 过滤无效参数
        if (!this.isOpen || nodeOrData == null || this.items == null ||
            typeof index !== "number" || index <= -1 || this.items.length <= index) {
            fbase.logger.error("updateItem:过滤无效参数")
            return
        }

        // 获取item
        let item = this.items[index], data: any = null, node: cc.Node = null
        if (nodeOrData instanceof cc.Node) {
            data = null
            node = nodeOrData
        } else {
            data = nodeOrData
            node = item.node
        }

        // 设置数据
        if (data != null) {
            item.setDatad(data)
        }

        // 设置节点
        if (node != null) {
            item.setNode(node)
            futils.tryCallFunc(this.setItemFunc, item)
        }
    }

    /**
     * 移动到指定索引的item处
     * @param index 索引
     * @param timeInSecond 移动时间ms
     */
    public moveTo(index: number, timeInSecond: number = 0): void {
        // 过滤无效参数
        if (!this.isOpen || this.isRendering || this.sv == null ||
            this.list == null || typeof index !== "number") {
            fbase.logger.error("moveTo:过滤无效参数")
            return
        }

        // 限制
        index = futils.limitNumber(index, 0, this.items.length)
        timeInSecond = Math.max(typeof timeInSecond === "number" ? timeInSecond : 0, 10)

        // 计算距离
        let listDis = this.getContentDisbyIndex(index - 1),
            pos = this._isHorizontal ? cc.v2(listDis, 0) : cc.v2(0, listDis)
        this.sv.scrollToOffset(pos, timeInSecond / 1000)
    }

    /** 停止自动滚动(滑动状态中禁止添加删除操作) */
    public stopMove(): void {
        // 过滤无效参数
        if (!this.isOpen || this.sv == null) {
            fbase.logger.error("stopMove:过滤无效参数")
            return
        }

        this.sv.stopAutoScroll()
    }

    /** 
     * 清理滑窗
     * @param isDestroy 是否销毁掉列表上的item节点
     */
    public clear(isDestroy: boolean): void {
        if (this.list != null) {
            this.list.removeAllChildren()
        }
        if (this.items != null) {
            this.items.forEach((item) => {
                if (this.itemPool != null) {
                    if (!isDestroy) {
                        item.setNode(null)
                    }
                    this.itemPool.put(item)
                } else {
                    item.dispose()
                }
            })
            this.items.length = 0
        }
        if (this._errorItems != null) {
            this._errorItems.length = 0
        }
        if (this._needRenderItems != null) {
            this._needRenderItems.length = 0
        }
        if (this._hadRenderItems != null) {
            this._hadRenderItems.length = 0
        }
    }

    /** 绑定属性 */
    protected bindProps(): void {
        // 滑窗组件
        this.sv = this.node.getComponent(cc.ScrollView)

        // 遮罩节点
        this.mask = getNodeOrComponent<cc.Node>(this.node, "mask_view", null, true)
        getNodeOrComponent(this.mask, null, cc.Mask, true)
        let maskWidget = getNodeOrComponent<cc.Widget>(this.mask, null, cc.Widget, true)
        maskWidget.target = this.node;
        [maskWidget.isAlignTop, maskWidget.isAlignBottom, maskWidget.isAlignLeft, maskWidget.isAlignRight] =
            [true, true, true, true];
        [maskWidget.top, maskWidget.bottom, maskWidget.left, maskWidget.right] = [0, 0, 0, 0];
        [this.mask.anchorX, this.mask.anchorY] = [0, 0]

        // 容器节点
        this.cn = getNodeOrComponent<cc.Node>(this.mask, "n_content", null, true)
        let cnWidget = getNodeOrComponent<cc.Widget>(this.cn, null, cc.Widget, true)
        cnWidget.target = this.node
        let cnLayout = getNodeOrComponent<cc.Layout>(this.cn, null, cc.Layout, true)
        cnLayout.resizeMode = cc.Layout.ResizeMode.CONTAINER;
        [this.cn.width, this.cn.height, this.cn.anchorX, this.cn.anchorY] = [0, 0, 0, 0]
        cnLayout.updateLayout()

        // 列表节点
        this.list = getNodeOrComponent<cc.Node>(this.cn, "n_list", null, true)
        let listWidget = getNodeOrComponent<cc.Widget>(this.list, null, cc.Widget, true)
        listWidget.target = this.node
        let listLayout = getNodeOrComponent<cc.Layout>(this.list, null, cc.Layout, true)
        listLayout.resizeMode = cc.Layout.ResizeMode.CONTAINER;
        [this.list.width, this.list.height, this.list.anchorX, this.list.anchorY] = [0, 0, 0, 0]
        listLayout.updateLayout()

        // 初始化滑窗组件参数
        this.sv.content = this.cn
        this.sv.brake = 0.75
        this.sv.bounceDuration = 0.23
    }

    /** 设置滑动限制方向 */
    protected setLimitDir(): void {
        // 节点未绑定
        if (this.sv == null || this.mask == null || this.cn == null || this.list == null) {
            this.bindProps()
            this.setLimitDir()
            return
        }

        // 获取组件
        let cnWidget = getNodeOrComponent<cc.Widget>(this.cn, null, cc.Widget, true)
        let cnLayout = getNodeOrComponent<cc.Layout>(this.cn, null, cc.Layout, true)
        let listWidget = getNodeOrComponent<cc.Widget>(this.list, null, cc.Widget, true)
        let listLayout = getNodeOrComponent<cc.Layout>(this.list, null, cc.Layout, true);

        // sv
        [this.sv.horizontal, this.sv.vertical] = [this._isHorizontal, !this._isHorizontal];

        // mask
        [this.mask.anchorX, this.mask.anchorY] = this._isHorizontal ? [0, 0.5] : [0.5, 1];

        // cn pos and anchor
        [this.cn.x, this.cn.y] = this._isHorizontal ? [-this.node.width / 2, 0] : [0, this.node.height / 2];
        [this.cn.anchorX, this.cn.anchorY] = this._isHorizontal ? [0, 0.5] : [0.5, 1];

        // cn widget align
        [cnWidget.isAlignTop, cnWidget.isAlignBottom, cnWidget.isAlignLeft, cnWidget.isAlignRight] =
            [this._isHorizontal, this._isHorizontal, !this._isHorizontal, !this._isHorizontal];
        [cnWidget.top, cnWidget.bottom, cnWidget.left, cnWidget.right] = [0, 0, 0, 0];

        // cn layout
        cnLayout.type = this._isHorizontal ? cc.Layout.Type.HORIZONTAL : cc.Layout.Type.VERTICAL;

        // list widget align
        [listWidget.isAlignTop, listWidget.isAlignBottom, listWidget.isAlignLeft, listWidget.isAlignRight] =
            [this._isHorizontal, this._isHorizontal, !this._isHorizontal, !this._isHorizontal];
        [listWidget.top, listWidget.bottom, listWidget.left, listWidget.right] = [0, 0, 0, 0]

        // list layout
        listLayout.type = this._isHorizontal ? cc.Layout.Type.HORIZONTAL : cc.Layout.Type.VERTICAL;

        // list pos
        [this.list.x, this.list.y] = this._isHorizontal ? [-this.node.width / 2, 0] : [0, this.node.height / 2];
        [this.list.anchorX, this.list.anchorY] = this._isHorizontal ? [0, 0.5] : [0.5, 1]

        cnLayout.resizeMode = cc.Layout.ResizeMode.CONTAINER;
    }

    /** 设置列表信息(item间隔，top/bottom间隔) */
    protected setListInfo(): void {
        // 节点未绑定
        if (this.cn == null || this.list == null) {
            this.bindProps()
            this.setListInfo()
            return
        }

        // 获取组件
        let cnLayout = getNodeOrComponent<cc.Layout>(this.cn, null, cc.Layout, true)
        let listLayout = getNodeOrComponent<cc.Layout>(this.list, null, cc.Layout, true);
        [listLayout.spacingX, listLayout.spacingY] = [this._spacing, this._spacing];
        [cnLayout.paddingTop, cnLayout.paddingLeft] = [this._paddingF, this._paddingF];
        [cnLayout.paddingBottom, cnLayout.paddingRight] = [this._paddingE, this._paddingE]
    }

    /** 添加监听 */
    protected addListen() {
        if (this.sv && this.sv.node) {
            this.sv.node.targetOff(this)
            this.sv.node.on("scrolling", this.onScrolling.bind(this), this)
        }
    }

    /** 移除监听 */
    protected removeListen() {
        if (this.sv && this.sv.node) {
            this.sv.node.targetOff(this)
        }
    }

    /** 
     * 渲染item
     * @param dt 间隔时间ms
     */
    protected renderItem(dt: number): void {
        // 过滤无效参数
        if (!this.isOpen || this.sv == null || this.list == null ||
            this._needRenderItems == null || this._needRenderItems.length == 0) {
            return
        }

        // 设置状态
        this.isRendering = true
        this.sv.enabled = false

        // 协程
        if (this.renderGenerator == null) {
            this.renderGenerator = this.renderItemInFrame(dt)
        }

        // 执行
        let v = this.renderGenerator.next()

        // 渲染超时
        if (v.value == ScrollGeneratorType.NEXT_FRAME) {
        }
        // 渲染错误 | 渲染结束
        else if (v.value == ScrollGeneratorType.RENDER_ERROR ||
            v.value == ScrollGeneratorType.DONE) {
            this.renderGenerator = null

            // 清理状态
            this.isRendering = true
            this.sv.enabled = true
        }
    }

    /** 
     * 分帧渲染item
     * @param dt 间隔时间ms
     * @return 协程对象(调用next返回一个ScrollGeneratorType类型数据)
     */
    protected * renderItemInFrame(dt: number): Generator<ScrollGeneratorType> {
        // 过滤无效参数
        if (this.list == null) {
            return ScrollGeneratorType.RENDER_ERROR
        }

        // 记录开始渲染时间
        let startTime = Date.now()

        // 遍历还未渲染的item
        for (; this._needRenderItems.length > 0;) {
            let item = this._needRenderItems.shift()
            if (item == null) {
                continue
            }

            // 设置节点
            let needBuildNode = item.node == null
            let result: cc.Node = futils.tryCallFunc(this.setItemFunc, item)
            if (result != null) {
                // 绑定节点
                if (needBuildNode) {
                    item.setNode(result)
                }

                // 计算list长度
                let listDis = this.getContentDisbyIndex(item.index - 1)
                listDis += this._isHorizontal ? result.width : result.height

                // 添加节点
                this.list.insertChild(result, item.index)

                // 设置节点位置
                result.x = this._isHorizontal ? listDis - (1 - result.anchorX) * result.width : 0
                result.y = this._isHorizontal ? 0 : result.anchorY * result.height - listDis

                // 显示范围
                let [front, back] = this.getShowRange(this._paddingF + listDis)

                // 检测是否在显示范围内
                let isIn = this._checkInRange(front, back, result)
                // 设置节点显示/隐藏
                result.opacity = isIn ? 255 : 0
                item.setActive(isIn)

                // 标记item渲染完成
                this._hadRenderItems = this.insertItemToItemArr(item, this._hadRenderItems, false)
            } else {
                // 标记item出错
                if (this._errorItems == null) {
                    this._errorItems = [item]
                } else {
                    this._errorItems.push(item)
                }

                return ScrollGeneratorType.RENDER_ERROR
            }

            // 每帧只能有一半的时间参与渲染，否则会卡
            if (Date.now() - startTime > dt / 2) {
                yield ScrollGeneratorType.NEXT_FRAME
            }
        }

        return ScrollGeneratorType.DONE
    }

    /** 清理出错item */
    protected clearErrorItem(): void {
        // 过滤无效参数
        if (this._errorItems == null || this._errorItems.length <= 0) {
            return
        }

        this._errorItems.forEach((item: ScrollItem) => {
            // 从item数组删除
            if (this.items != null) {
                for (let i = 0, len = this.items.length; i < len; i++) {
                    let t = this.items[i];
                    if (t == item) {
                        this.items.splice(i, 1)
                        break
                    }
                }
            }

            // 回收
            if (this.itemPool != null) {
                this.itemPool.put(item)
            }
        })
        this._errorItems.length = 0
    }

    /** 滑动 */
    protected onScrolling(): void {
        // 过滤无效参数
        if (!this.isOpen || this.list.childrenCount <= 0 ||
            this._hadRenderItems == null || this._hadRenderItems.length <= 0) {
            return
        }

        let lisiDis = this.list.height,
            weight = -1
        if (this._isHorizontal) {
            lisiDis = this.list.width
            weight = 1
        }

        // 显示范围
        let [front, back] = this.getShowRange(this._paddingF + lisiDis)

        // 寻到front和back所在的item
        let frontItem: ScrollItem = null, backItem: ScrollItem = null,
            lastDis = 0, curDis = 0
        for (let i = 0, len = this._hadRenderItems.length; i < len; i++) {
            let item = this._hadRenderItems[i], node = item.node, isShow = false

            lastDis = curDis
            curDis += (i == 0 ? this._paddingF : this._spacing) * weight
            curDis += (this._isHorizontal ? node.width : node.height) * weight

            // 寻找front所在的item
            if (frontItem == null && (lastDis - front) * weight <= 0 && (front - curDis) * weight <= 0) {
                frontItem = item
            }

            // 寻找back所在的item
            if (backItem == null && (lastDis - back) * weight <= 0 && (back - curDis) * weight <= 0) {
                backItem = item
            }

            // 计算是否显示
            if (frontItem != null) {
                isShow = frontItem.index <= item.index ? true : false
            }
            if (backItem != null) {
                isShow = backItem.index >= item.index ? true : false
            }

            // 退出循环标志
            let isEnd = false
            if (backItem != null && !item.active && !isShow) {
                isEnd = true
            }

            // 设置节点显示/隐藏
            node.opacity = isShow ? 255 : 0
            item.setActive(isShow)

            if (isEnd) {
                break
            }
        }
    }

    /**
     * 返回节点在世界坐标系下的对齐轴向的包围盒(rect的x,y表示为矩形的左下角的坐标)
     * @param node 节点
     * @param out 输出引用
     * @return 包围盒
     */
    protected getBoxToWorld(node: cc.Node, out: cc.Rect = null): cc.Rect {
        // 更新世界矩阵
        // @ts-ignore
        node._updateWorldMatrix()

        // 盒子世界坐标
        // @ts-ignore
        let matrix = node._worldMatrix,
            tx = matrix.m12, ty = matrix.m13

        // 创建盒子
        if (out == null) {
            out = cc.rect()
        }

        // rect的x,y表示为矩形的左下角的坐标
        [out.x, out.y, out.width, out.height] = [
            tx - node.anchorX * node.width,
            ty - node.anchorY * node.height,
            node.width, node.height
        ]

        return out
    }

    /**
     * 插入item到一个列表中
     * @param item 需要插入的item
     * @param arr 插入的数组
     * @param needChangeIndex 是否需要根据顺序修改item的index
     * @return 插入后的列表
     */
    protected insertItemToItemArr(item: ScrollItem, arr: ScrollItem[], needChangeIndex: boolean): ScrollItem[] {
        // 过滤无效参数
        if (arr == null) {
            needChangeIndex && item.setIndex(0)
            return [item]
        }

        arr.push(item)

        let lastItem: ScrollItem = null, hideOne = false
        for (let len = arr.length, i = len - 2; i >= 0; i--) {
            let tmp = arr[i], j = i + 1
            if (tmp.index < item.index) {
                break
            }

            if (needChangeIndex) {
                tmp.setIndex(tmp.index + 1)

                // 插入一个节点就要在其下方隐藏一个节点
                if (!hideOne && tmp.active &&
                    lastItem != null && !lastItem.active) {
                    tmp.setActive(false)
                    tmp.node != null && (tmp.node.opacity = 0)
                    hideOne = true
                }
            }
            lastItem = arr[i];
            [arr[i], arr[j]] = [arr[j], arr[i]]
        }

        return arr
    }

    /**
     * 从一个列表中删除item
     * @param index 需要删除的item的index
     * @param arr 删除的数组
     * @param needChangeIndex 是否需要根据顺序修改item的index
     * @return 被删除的item
     */
    protected deletItemToArr(index: number, arr: ScrollItem[], needChangeIndex: boolean): ScrollItem {
        // 过滤无效参数
        if (arr == null) {
            return null
        }

        let target: ScrollItem = null, showOne = false
        for (let i = 0, len = arr.length; i < len; i++) {
            let item = arr[i], j = i - 1
            if (item.index == index) {
                target = item
            } else if (item.index > index) {
                if (target != null && j >= 0) {
                    if (needChangeIndex) {
                        item.setIndex(item.index - 1)

                        // 移除一个节点就要在其下方多显示一个节点
                        if (!item.active && !showOne) {
                            showOne = true
                            item.setActive(true)
                            item.node != null && (item.node.opacity = 255)
                        }
                    }
                    [arr[j], arr[i]] = [arr[i], arr[j]]
                }
            }
        }
        if (target != null) {
            arr.pop()
        }

        return target
    }

    /** 
     * 获取节点显示范围
     * @param dis content节点坐标系下(0, 0)点到末尾item节点的距离
     * @return 显示范围[front, back]
     */
    protected getShowRange(dis: number): number[] {
        // 过滤无效参数
        if (this.mask == null || this.cn == null) {
            return
        }

        let front = this.cn.y, maskDis = this.mask.height, weight = -1,
            getFront = Math.min, getBack = Math.max
        if (this._isHorizontal) {
            front = -this.cn.x
            maskDis = this.mask.width
            weight = 1
            getFront = Math.max
            getBack = Math.min
        }

        front = getFront((front - this.halfAddDis) * weight, 0)
        let back = getBack(front + (maskDis + this.halfAddDis) * weight, dis * weight)
        return [front, back]
    }

    /**
     * 通过索引获取content节点坐标系(0, 0)点到index索引的item节点的距离长度
     * @param index item的index
     * @return 距离长度
     */
    protected getContentDisbyIndex(index: number): number {
        // 过滤无效参数
        if (this.list == null || index < 0 || this.list.childrenCount <= index) {
            return 0
        }

        let cnDis = this._paddingF
        for (let i = 0; i <= index; i++) {
            let node = this.list.children[i]

            // 过滤错误
            if (node == null) {
                return cnDis
            }

            cnDis += (i != 0 ? this._spacing : 0) + (this._isHorizontal ? node.width : node.height)
        }
        return cnDis
    }

    /** 
     * 检测节点是否在范围内
     * @param front 范围的前面值
     * @param back 范围的后面值
     * @param n 检测节点
     * @return 是否在范围内
     */
    private _checkInRange(front: number, back: number, n: cc.Node): boolean {
        let nDis = n.height, nAnchor = n.anchorX, nFront = n.y, weight = -1
        if (this._isHorizontal) {
            nDis = n.width
            nAnchor = n.anchorX
            nFront = n.x
            weight = 1
        }

        nFront = nFront - nAnchor * nDis * weight
        let nBack = nFront + nDis * weight

        if (this._isHorizontal) {
            return nFront <= front && nBack >= front || nFront >= front && nBack <= back || nFront <= back && nBack >= back
        } else {
            return nFront >= front && nBack <= front || nFront <= front && nBack >= back || nFront >= back && nBack <= back
        }
    }
}