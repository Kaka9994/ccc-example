import GameObject from "../base/GameObject";
import { MyNodePool } from "../base/MyNodePool";
import { GameState } from "../enum/GameState";
import GameController from "./GameController";
import ObstacleObject from "./ObstacleObject";


const { ccclass, property } = cc._decorator;

const COUNT_LIMIT = 10;

/**
 * 障碍物控制器
 */
@ccclass
export default class ObstacleController extends cc.Component {

    @property(cc.Prefab)
    public obstaclePrefab: cc.Prefab = null;

    /** 状态 */
    private _state: GameState = GameState.NONE;

    /** 游戏控制脚本 */
    private _gameCtrl: GameController = null;

    /** 边界 */
    private _border: { left: number, right: number, up: number, down: number } = null;

    /** 创建障碍物范围 */
    private _obstaleRange: { left: number, right: number, up: number, down: number } = null;

    /** 障碍物对象池 */
    private _obstaclePool: MyNodePool = null;

    /** 障碍物列表 */
    private _obstacleList: { [name: string]: ObstacleObject } = {};

    public onLoad(): void {
    }

    public start(): void {
        // 创建节点池
        if (this.obstaclePrefab) {
            this._obstaclePool = new MyNodePool(this.obstaclePrefab);
        }
        // 获取创建障碍物范围
        let ndObstaleRange = cc.find("Canvas/sp_tree/nd_obstale_range");
        this._obstaleRange = { 
            left: ndObstaleRange.x - ndObstaleRange.width / 2, 
            right: ndObstaleRange.x + ndObstaleRange.width / 2, 
            up: ndObstaleRange.y + ndObstaleRange.height / 2, 
            down: ndObstaleRange.y + ndObstaleRange.height / 2
        };
    }

    public update(dt): void {
        if (this._state == GameState.PLAYING) {
        }
    }

    public onDestroy(): void {
    }

    /** 设置状态 */
    public setState(state: GameState): void {
        this._state = state;
        for (let i in this._obstacleList) {
            let obstacle = this._obstacleList[i];
            if (obstacle) {
                obstacle.setState(state);
            }
        }
    }

    /** 绑定游戏控制脚本 */
    public setGameCtr(gameCtr: GameController): void {
        this._gameCtrl = gameCtr;
    }

    /** 设置边界 */
    public setBorder(border: { left: number, right: number, up: number, down: number }): void {
        this._border = border;
        for (let i in this._obstacleList) {
            let obstacle = this._obstacleList[i];
            if (obstacle) {
                obstacle.setBorder(border);
            }
        }
    }

    /** 获取障碍物 */
    public getObstacles(): GameObject[] {
        // 过滤
        if (!this._obstacleList) {
            return [];
        }

        let list: GameObject[] = [];
        for (let i in this._obstacleList) {
            list.push(this._obstacleList[i]);
        }
        return list;
    }

    /** 创建一个障碍物 */
    public createObstacle(): void {
        // 过滤
        if (!this._obstaclePool || !this._border || !this._obstacleList) {
            return;
        }

        // 数量限制
        let count = Object.keys(this._obstacleList).length;
        if (count >= COUNT_LIMIT) {
            return;
        }

        // 创建
        let newObstacle = this._obstaclePool.Get();
        let script = newObstacle.getComponent(ObstacleObject);
        let pos = cc.v2(
            this._obstaleRange.left + Math.random() * (this._obstaleRange.right - this._obstaleRange.left),
            this._obstaleRange.down + Math.random() * (this._obstaleRange.up - this._obstaleRange.down) + 150,
        );

        // 设置名字
        script.obstacleName = "obstacle" + getRound();
        // 设置位置
        [newObstacle.x, newObstacle.y] = [pos.x, pos.y];
        // 设置边界
        script.setBorder(this._border);
        // 设置障碍物控制器
        script.setObstacleCtrl(this);
        // 设置速度
        script.setSpeed(0);

        // 添加
        this._obstacleList[script.obstacleName] = script;
        this.node.addChild(newObstacle);

        // 播放出现动画
        script.showIn(() => {
            // 设置状态
            script.setState(this._state);
        })
    }

    /** 销毁一个障碍物 */
    public destroyObstacle(target: cc.Node, isSmash: boolean): void {
        // 过滤
        if (!target || !this._obstaclePool) {
            return;
        }

        let script = target.getComponent(ObstacleObject);

        // 清空状态
        script.setState(GameState.NONE);

        // 播放撞击动画
        if (isSmash) {
            script.showSmash(() => {
                // 移除
                delete this._obstacleList[script.obstacleName];
                target.removeFromParent();
                this._obstaclePool.Put(target);
            })
            return;
        }

        // 移除
        delete this._obstacleList[script.obstacleName];
        target.removeFromParent();
        this._obstaclePool.Put(target);
    }

    /** 清空所有障碍物 */
    public clearObstacle(): void {
        // 过滤
        if (!this._obstaclePool || !this._obstacleList) {
            return;
        }

        for (let i in this._obstacleList) {
            let obstacle = this._obstacleList[i];
            obstacle.node.removeFromParent();
            this._obstaclePool.Put(obstacle.node);
        }
        this._obstacleList = {};
    }
}

// 随机
var round: number = 0;
function getRound() {
    let r = round;
    round++;
    if (round >= 0xFFFFFF) {
        round = 0;
    }
    return r;
} 
