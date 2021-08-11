import GameObject from "../base/GameObject";


/**
 * 碰撞管理器
 */
export default class CollisionManager {
    // 单例
    private static _instance: CollisionManager = null;
    public static me(): CollisionManager {
        if (!this._instance) {
            this._instance = new CollisionManager();
        }
        return this._instance;
    }

    /**
     * 检测是否碰撞
     * @param target 目标节点
     * @param obstacles 障碍物节点列表
     * @return 碰撞的障碍物
     */
    public checkCollisionAABB(target: GameObject, obstacleList: GameObject[]): GameObject {
        // 过滤
        if (!target || obstacleList.length <= 0) {
            return null;
        }

        for (let i in obstacleList) {
            let obstacle = obstacleList[i];
            if (target.checkCollisionAABB(obstacle)) {
                return obstacle;
            }
        }
        return null;
    }
}