import * as fbase from "../../../framework/core/base/pkg_base"
import * as fcommon from "../../../framework/core/common/pkg_common"
import * as futils from "../../../framework/core/utils/pkg_utils"
import * as frendermgr from "../../../framework/manager/render/pkg_rendermgr"
import Global from "../../utils/Global"
import { getNodeOrComponent } from "../../utils/NodeUtil"
import { ScrollItem } from "./ScrollItem"
import { ScrollListBaseComp } from "./ScrollListBaseComp"
import { ScrollGeneratorType, ScrollMoveDirType } from "./ScrollType"

const Scroll_Name = "Scroll_List_Recycle"

const { ccclass } = cc._decorator

/** 重复利用item滑动列表组件(单向滑动) */
@ccclass
export class ScrollListRecycleComp extends ScrollListBaseComp {
    /** 顶部弹簧节点 */
    private _topSpring: cc.Node = null
    /** 底部弹簧节点 */
    private _btmSpring: cc.Node = null
    /** item的节点模板 */
    private _nodeTemplate: cc.Node = null
    /** item的节点池 */
    private _nodePool: fcommon.ObjectPool<cc.Node> = null
    /** 限制节点的数量 */
    private _limitNodeCount: number = 0
    /** 需要创建的节点数量 */
    private _needNodeCount: number = 0
    /** 滑动方向上单位item的距离 */
    private _itemDis: number = 0
    /** 加载到list上的首item的index */
    private _startIndex: number = 0
    /** 加载到list上的尾item的index */
    private _endIndex: number = 0

    public dispose(): void {
        super.dispose()

        this._limitNodeCount = 0
        this._needNodeCount = 0
        this._itemDis = 0
        this._startIndex = 0
        this._endIndex = 0
        if (this._nodeTemplate != null) {
            this._nodeTemplate.destroy()
            this._nodeTemplate = null
        }
        if (this._nodePool != null) {
            this._nodePool.dispose()
            this._nodePool = null
        }
    }

    /**
     * 初始化(使用列表前需要调用一次)
     * @param setItemFunc 设置item的回调
     * @param halfAddDis 额外补充的可视距离(一半)(一般设置为滑窗滑动方向上item节点的尺寸最大值)
     * @param nodeTemplate item节点模板
     */
    public init(setItemFunc: (item: ScrollItem) => cc.Node, halfAddDis: number, nodeTemplate: cc.Node | cc.Prefab): void {
        super.init(setItemFunc, halfAddDis)
        // 绑定节点模版
        this._nodeTemplate = nodeTemplate instanceof cc.Prefab ? cc.instantiate(nodeTemplate) : nodeTemplate
        // 创建节点池
        let r = fcommon.getRound(Scroll_Name), self = this
        this._nodePool = fcommon.store.createPool(Scroll_Name + "_Node" + r, this._nodeTemplate)
        this._nodePool["new"] = function (...args: any[]): cc.Node {
            if (this._template == null) {
                return null
            }
            return cc.instantiate(this._template)
        }
        this._nodePool["unuse"] = function (obj: cc.Node, ...args) {
            obj != null && obj.removeFromParent()
        }
        this._nodePool["dispose"] = function () {
            for (let i = 0, len = this._pool.length; i < len; i++) {
                let obj: cc.Node = this._pool[i]
                if (obj != null) {
                    obj.destroy()
                }
            }
            this._pool.length = 0
            if (this._template != null) {
                this._template.destroy()
                this._template = null
            }
        }

        // 计算需要创建的item的节点的数量
        this._itemDis = this.isHorizontal ? this._nodeTemplate.width : this._nodeTemplate.height
        let nodeCount = 0, maskDis = this.isHorizontal ? this.mask.width : this.mask.height
        for (let curDis = 0; curDis < maskDis; nodeCount++) {
            curDis += (nodeCount == 0 ? 0 : this.spacing) + this._itemDis
        }
        this._limitNodeCount = this._needNodeCount = (nodeCount + 2)

        this.halfAddDis = this._itemDis + this.spacing
    }

    /**
     * 初始化列表数据
     * (若想多次初始化，需要事先调用clean清理列表节点)
     * @param datas 数据数组
     */
    public initList(datas: any[]): void {
        // 过滤无效参数
        if (!this.isOpen || datas == null || datas.length <= 0 ||
            this.items != null && this.items.length > 0) {
            fbase.logger.error("initList:过滤无效参数")
            return
        }

        // 构造items
        this.items = datas.map((value: any, i: number) => {
            let item = this.itemPool.get(null, i, value)
            item.setActive(false)
            return item
        })

        // 开始显示节点
        this._showItems(0)
    }

    /**
     * 插入一个item
     * @param data 数据
     * @param index 索引,插入的位置(默认null，添加到末尾)
     */
    public insertItem(data: any, index: number = null): void {
        // 过滤无效参数
        if (!this.isOpen || data == null || this.list == null) {
            fbase.logger.error("insertItem:过滤无效参数")
            return
        }

        if (this.items == null) {
            this.items = []
        }

        // 限制索引
        index = futils.limitNumber(typeof index === "number" ? index : this.items.length, 0, this.items.length)

        // 创建item
        let item = this.itemPool.get(null, index, data)
        item.setActive(true)

        // 插入到items中
        this.items = this.insertItemToItemArr(item, this.items, true)

        // 添加一个节点
        if (index <= this._endIndex) {
            let n = this._nodePool.get(),
                newIndex = index < this._startIndex ? this._startIndex : index,
                newItem = this.items[newIndex]
            newItem.setNode(n)
            n.x = 0
            n.y = 0

            // 设置节点
            futils.tryCallFunc(this.setItemFunc, newItem)

            // 添加到list上
            let i = Math.max(newIndex - this._startIndex, 0)
            this.list.insertChild(newItem.node, i)
        }

        // 弹簧尺寸改变
        if (this.isHorizontal) {
            this._btmSpring.width -= this._itemDis + this.spacing
        } else {
            this._btmSpring.height -= this._itemDis + this.spacing
        }
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

        // 从items中删除
        this.deletItemToArr(index, this.items, true)

        // 添加一个节点
        if (index <= this._endIndex) {
            let n = this._nodePool.get(),
                newItem = this.items[this._endIndex]
            newItem.setNode(n)
            n.x = 0
            n.y = 0

            // 设置节点
            futils.tryCallFunc(this.setItemFunc, newItem)

            // 添加到list上
            let i = Math.max(this._endIndex - this._startIndex, 0)
            this.list.insertChild(newItem.node, i)
        }

        // 弹簧尺寸改变
        if (this.isHorizontal) {
            this._btmSpring.width -= this._itemDis + this.spacing
        } else {
            this._btmSpring.height -= this._itemDis + this.spacing
        }

        return null
    }

    /**
     * 更新item
     * @param data 数据
     * @param index 索引,更新的位置(默认null，添加到末尾)
     */
    public updateItem(data: any, index: number = null): void {
        // 过滤无效参数
        if (!this.isOpen || data == null || this.items == null ||
            typeof index !== "number" || index <= -1 || this.items.length <= index) {
            fbase.logger.error("updateItem:过滤无效参数")
            return
        }

        // 获取item
        let item = this.items[index]

        // 设置数据
        if (data != null) {
            item.setDatad(data)
        }

        // 设置节点
        if (item.node != null) {
            futils.tryCallFunc(this.setItemFunc, item)
        }
    }

    /** 
     * 清理滑窗
     */
    public clear(): void {
        super.clear(true)

        this._limitNodeCount = 0
        this._needNodeCount = 0
        this._itemDis = 0
        this._startIndex = 0
        this._endIndex = 0
    }

    /** 绑定属性 */
    protected bindProps(): void {
        super.bindProps()

        this._topSpring = getNodeOrComponent<cc.Node>(this.cn, "n_top_spring", null, true)
        this._btmSpring = getNodeOrComponent<cc.Node>(this.cn, "n_btm_spring", null, true);
        [this._topSpring.width, this._topSpring.height] = [0, 0];
        [this._btmSpring.width, this._btmSpring.height] = [0, 0]
        this._topSpring.setSiblingIndex(0)
        this._btmSpring.setSiblingIndex(2)
    }

    /** 
     * 渲染item
     * @param dt 间隔时间ms
     */
    protected renderItem(dt: number): void {
        // 过滤无效参数
        if (!this.isOpen || this._nodePool == null || this._needNodeCount <= 0) {
            return
        }

        // 设置状态
        this.isRendering = true

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
            this.isRendering = false

            // 开始显示节点
            this._showItems(0)
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
        for (; this._needNodeCount > 0; this._needNodeCount--) {
            // 创建节点(隐式调用)
            let result = this._nodePool["new"]()
            if (result != null) {
                this._nodePool.put(result)
            } else {
                return ScrollGeneratorType.RENDER_ERROR
            }

            // 每帧只能有一半的时间参与渲染，否则会卡
            if (Date.now() - startTime > dt / 2) {
                yield ScrollGeneratorType.NEXT_FRAME
            }
        }

        return ScrollGeneratorType.DONE
    }

    /** 滑动 */
    protected onScrolling(): void {
        // 过滤无效参数
        if (!this.isOpen || this.cn == null || this.items == null ||
            this.items.length <= 0) {
            return
        }

        // 显示范围
        let [front, back] = this.getShowRange(null)

        let itemAndSpacingDis = this._itemDis + this.spacing,
            toStartDis = this.paddingF + itemAndSpacingDis * (this._startIndex + 1) - this.spacing,
            toEndDis = toStartDis + itemAndSpacingDis * (this._endIndex - this._startIndex)

        let offset = this.cn.y, weight = -1
        if (this.isHorizontal) {
            offset = this.cn.x
            weight = 1
        }

        // 遍历判断头部节点是否超出显示范围
        for (; this._endIndex < this.items.length && this._startIndex < this._endIndex && this._startIndex < this.items.length - 1;) {
            let headItem = this.items[this._startIndex], node = headItem.node
            if (node == null) {
                break
            }

            // 判断头部节点是否超出显示范围
            if (front * weight > toStartDis + offset * weight &&
                this._endIndex < this.items.length - 1 &&
                this._startIndex < this.items.length - 1) {
                // 解绑
                headItem.setNode(null)

                // 更新距离
                toStartDis += itemAndSpacingDis
                toEndDis += itemAndSpacingDis

                // 显示节点索引改变
                this._startIndex += 1
                this._endIndex += 1

                // 将头部节点移动至尾部
                // 设置末尾item属性
                let tailItem = this.items[this._endIndex]
                tailItem.setNode(node)
                tailItem.setActive(true);
                [node.x, node.y] = [0, 0]

                // 设置节点
                futils.tryCallFunc(this.setItemFunc, tailItem)

                // 添加到list上
                node.removeFromParent()
                this.list.addChild(node)

                // 弹簧尺寸改变
                this._changeSpring(false, this._startIndex - 1)
            } else {
                break
            }
        }

        // 遍历判断尾部节点是否超出显示范围
        for (; this._startIndex > 0 && this._startIndex < this._endIndex && this._endIndex > 0;) {
            let tailItem = this.items[this._endIndex], node = tailItem.node
            if (tailItem.node == null) {
                break
            }

            // 判断尾部节点是否超出显示范围
            if (back * weight < (toEndDis - this._itemDis) + offset * weight &&
                this._startIndex > 0 && this._endIndex > 0) {
                // 解绑
                tailItem.setNode(null)

                // 更新距离
                toStartDis -= itemAndSpacingDis
                toEndDis -= itemAndSpacingDis

                // 显示节点索引改变
                this._startIndex -= 1
                this._endIndex -= 1

                // 将尾部节点移动至头部
                // 设置头部item属性
                let headItem = this.items[this._startIndex]
                headItem.setNode(node)
                headItem.setActive(true);
                [node.x, node.y] = [0, 0]

                // 设置节点
                futils.tryCallFunc(this.setItemFunc, headItem)

                // 添加到list上
                node.removeFromParent()
                this.list.insertChild(node, 0)

                // 弹簧尺寸改变
                this._changeSpring(false, this._endIndex + 1)
            } else {
                break
            }
        }
    }

    /**
     * 插入item到一个列表中
     * @param item 需要插入的item
     * @param arr 插入的数组
     * @return 插入后的列表
     */
    protected insertItemToItemArr(item: ScrollItem, arr: ScrollItem[], _: boolean): ScrollItem[] {
        // 过滤无效参数
        if (arr == null) {
            this._startIndex = this._endIndex = 0
            item.setIndex(0)
            return [item]
        }

        // 移除末尾节点
        if (item.index <= this._endIndex) {
            let endItem = arr[this._endIndex]

            this._nodePool.put(endItem.node)
            endItem.setActive(false)
            endItem.setNode(null)
        }

        // 插入
        arr.push(item)
        for (let len = arr.length, i = len - 2; i >= 0; i--) {
            let tmp = arr[i], j = i + 1
            if (tmp.index < item.index) {
                break
            }

            tmp.setIndex(tmp.index + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]]
        }

        return arr
    }

    /**
     * 从一个列表中删除item
     * @param index 需要删除的item的index
     * @param arr 删除的数组
     * @param _ 是否需要根据顺序修改item的index
     * @return 被删除的item
     */
    protected deletItemToArr(index: number, arr: ScrollItem[], _: boolean): ScrollItem {
        // 过滤无效参数
        if (arr == null) {
            return null
        }

        // 移除一个节点
        let delNodeIndex = index < this._startIndex ? this._startIndex : index,
            delNodeItem = this.items[delNodeIndex]
        if (delNodeItem.node != null) {
            this._nodePool.put(delNodeItem.node)
            delNodeItem.setActive(false)
            delNodeItem.setNode(null)
        }

        // 删除
        let target: ScrollItem = null
        for (let i = 0, len = arr.length; i < len; i++) {
            let item = arr[i], j = i - 1
            if (item.index == index) {
                target = item
            } else if (item.index > index && target != null && j >= 0) {
                item.setIndex(item.index - 1);
                [arr[j], arr[i]] = [arr[i], arr[j]]
            }
        }
        if (target != null) {
            arr.pop()
        }

        return target
    }

    /** 
     * 获取节点显示范围
     * @return 显示范围[front, back]
     */
    protected getShowRange(_: any): number[] {
        // 过滤无效参数
        if (this.mask == null || this.cn == null) {
            return
        }

        let maxListDis = (this._itemDis + this.spacing) * this._limitNodeCount + this.paddingF - this.spacing,
            maskDis = this.mask.height,
            weight = -1
        if (this.isHorizontal) {
            maskDis = this.mask.width
            weight = 1
        }

        let front = (maxListDis - maskDis) / 2 * weight * -1,
            back = front + maxListDis * weight
        return [front, back]
    }

    /**
     * 通过索引获取content节点坐标系(0, 0)点到index索引的item节点的距离长度
     * @param index item的index
     * @return 距离长度
     */
    protected getContentDisbyIndex(index: number): number {
        // 过滤无效参数
        if (index < 0 || this.items.length <= index) {
            return 0
        }

        let cnDis = this.paddingF
        for (let i = 0; i <= index; i++) {
            cnDis += (i == 0 ? 0 : this.spacing) + this._itemDis
        }
        return cnDis
    }

    /** 
     * 显示节点
     * @param index 索引，从对应节点开始显示
     */
    private _showItems(index: number): void {
        // 过滤无效参数
        if (this.isRendering || this._needNodeCount > 0 || this.items == null ||
            this.items.length <= 0 || this._nodePool == null ||
            this.cn == null || this.sv == null || this.list == null) {
            return
        }

        // 限制索引
        index = futils.limitNumber(
            typeof index === "number" ? index : this.items.length - 1,
            0,
            this.items.length - 1
        )

        // 显示节点的数量
        let count = Math.min(this._limitNodeCount, this.items.length)

        this._startIndex = Math.max(index - 1, 0)
        this._endIndex = this._startIndex + count - 1

        // 显示节点
        for (let i = this._startIndex, hadShow = 0; hadShow < count; i++, hadShow++) {
            // 设置节点
            let item = this.items[i],
                node = this._nodePool.get()

            // 设置属性
            item.setNode(node)
            item.setActive(true);
            [node.x, node.y] = [0, 0]

            // 设置节点
            let result: cc.Node = futils.tryCallFunc(this.setItemFunc, item)

            // 添加到list上
            if (result != null) {
                this.list.addChild(node)
            }
        }

        // 设置弹簧尺寸
        let topDis = (this._itemDis + this.spacing) * this._startIndex,
            btmDis = (this._itemDis + this.spacing) * (this.items.length - this._endIndex - 1);
        [this._topSpring.width, this._topSpring.height] = this.isHorizontal ? [topDis, 0] : [0, topDis];
        [this._btmSpring.width, this._btmSpring.height] = this.isHorizontal ? [btmDis, 0] : [0, btmDis]

        // 移动至
        let cnLayout = getNodeOrComponent<cc.Layout>(this.cn, null, cc.Layout, true)
        cnLayout.updateLayout()
        let moveDis = index == 0 ? 0 : this.paddingF + topDis + this._itemDis
        let pos = this.isHorizontal ? cc.v2(moveDis, 0) : cc.v2(0, moveDis)
        this.sv.scrollToOffset(pos)
    }

    /** 
     * 弹簧尺寸改变
     * @param isAdd 是否是添加一个节点(false:为移除一个节点)
     * @param index 添加/移除节点的索引
     */
    private _changeSpring(isAdd: boolean, index: number): void {
        let itemAndSpacingDis = this._itemDis + this.spacing

        if (!isAdd && index < this._startIndex ||
            isAdd && index < this._startIndex) {
            if (this.isHorizontal) {
                this._btmSpring.width = Math.max(this._btmSpring.width - itemAndSpacingDis, 0)
                this._topSpring.width += itemAndSpacingDis
            } else {
                this._btmSpring.height = Math.max(this._btmSpring.height - itemAndSpacingDis, 0)
                this._topSpring.height += itemAndSpacingDis
            }
        } else if (isAdd && this._endIndex < index ||
            !isAdd && this._endIndex < index) {
            if (this.isHorizontal) {
                this._topSpring.width = Math.max(this._topSpring.width - itemAndSpacingDis, 0)
                this._btmSpring.width += itemAndSpacingDis
            } else {
                this._topSpring.height = Math.max(this._topSpring.height - itemAndSpacingDis, 0)
                this._btmSpring.height += itemAndSpacingDis
            }
        }
    }
}