

const { ccclass, property } = cc._decorator;

/**
 * 游戏对象基类
 */
@ccclass
export default class GameObject extends cc.Component {

    /** 碰撞尺寸 */
    protected _collisionSize: cc.Size = new cc.Size(0, 0); 

    public onLoad(): void {
    }

    public start(): void {
    }

    public update(dt): void {
    }

    public onDestroy(): void {
    }

    /** 设置碰撞尺寸 */
    protected _setCollisionSize(size: cc.Size): void {
        this._collisionSize = size;
    }

    /** 检测自身与目标节点是否碰撞 */
    public checkCollisionAABB(target: GameObject): boolean {
        // 过滤
        if (!this.node || !target || !target.node) {
            return false;
        }

        let dx = Math.abs(this.node.x - target.node.x);
        let dy  = Math.abs(this.node.y - target.node.y);
        let w = this._collisionSize.width / 2 + target._collisionSize.width / 2;
        let h = this._collisionSize.height / 2 + target._collisionSize.height / 2;

        // AABB碰撞
        if (dx < w && dy < h) {
            return true;
        }

        return false;
    }
}