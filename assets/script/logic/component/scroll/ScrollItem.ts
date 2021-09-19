import * as fcommon from "../../../framework/core/common/pkg_common"

/** 滑动子节点 */
export class ScrollItem implements fcommon.IRecover, fcommon.IDispose {
    /** 节点 */
    private _node: cc.Node = null
    /** 节点 */
    public get node(): cc.Node {
        return this._node
    }

    /** 所在列表中的索引 */
    private _index: number = -1
    /** 所在列表中的索引 */
    public get index(): number {
        return this._index
    }

    /** item描述数据 */
    private _data: any = null
    /** item描述数据 */
    public get data(): any {
        return this._data
    }

    /** 是否是激活的 */
    private _active: boolean = false
    /** 是否是激活的 */
    public get active(): boolean {
        return this._active
    }

    /** 回收 */
    public recover(): void {
        [this._node, this._index, this._data, this._active] =
            [null, -1, null, false]
    }

    /** 销毁 */
    public dispose(): void {
        if (this._node != null) {
            this._node.destroy()
        }
        [this._node, this._index, this._data, this._active] =
            [null, -1, null, false]
    }

    /**
     * 设置属性
     * @param n 节点
     * @param i 索引
     * @param d 数据
     */
    public setTo(n: cc.Node, i: number, d: any): void {
        [this._node, this._index, this._data] = [n, i, d]
    }

    /** 
     * 设置节点
     * @param n 节点
     */
    public setNode(n: cc.Node): void {
        this._node = n
    }

    /** 
     * 设置索引
     * @param i 索引
     */
    public setIndex(i: number): void {
        this._index = i
    }

    /** 
     * 设置数据
     * @param d 数据
     */
    public setDatad(d: any): void {
        this._data = d
    }

    /**
     * 设置激活状态
     * @param a 激活状态
     */
    public setActive(a: boolean): void {
        this._active = a
    }
}