
/**节点缓存池 */
export class MyNodePool {
    private nodeTemplate: cc.Node = null // 模板节点
    private pool: cc.NodePool = null // ccc缓存池

    /**
     * 构造
     * @param n 节点对象
     */
    constructor(n: cc.Node | cc.Prefab) {
        this.nodeTemplate = <cc.Node>cc.instantiate(n)
        this.pool = new cc.NodePool()

        if (n instanceof cc.Prefab) {
            n.destroy()
        }
    }

    /**
     * 获取节点
     * @return cc.Node: 节点
     */
    public Get(): cc.Node {
        if (!this.nodeTemplate || !this.pool) {
            return
        }
        let node = this.pool.get()
        if (!node) {
            node = cc.instantiate(this.nodeTemplate)
        }
        return node
    }

    /**
     * 放入节点
     * @param n 不需要的节点
     */
    public Put(n: cc.Node) {
        if (!this.nodeTemplate || !this.pool || !n) {
            return
        }
        if (n.parent) {
            n.removeFromParent()
        }
        this.pool.put(n)
    }

    /**
     * 缓存池可用对象数量
     * @return number: 对象池可用对象数量
     */
    public Size(): number {
        if (!this.nodeTemplate || !this.pool) {
            return
        }
        return this.pool.size()
    }

    /**清理缓存池 */
    public Clear() {
        if (!this.nodeTemplate || !this.pool) {
            return
        }
        this.pool.clear()
    }

    /**销毁缓存池 */
    public Destroy() {
        if (this.pool) {
            this.pool.clear()
        }
        if (this.nodeTemplate) {
            this.nodeTemplate.destroy()
        }

        this.pool = null
        this.nodeTemplate = null
    }

    // === 扩展 ===

    /**
     * 放入节点数组
     * @param ns 不需要的节点的数组
     */
    public PutArr(ns: cc.Node[]) {
        if (!ns || ns.length <= 0) {
            return
        }

        for (let i = ns.length - 1; i >= 0; i--) {
            this.Put(ns[i])
        }
    }
}