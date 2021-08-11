import GameObject from "../base/GameObject";
import { GameState } from "../enum/GameState";
import { RoleState } from "../enum/RoleState";


const { ccclass, property } = cc._decorator;

const ROLE_SPEED = 500;

/**
 * 人物控制
 */
@ccclass
export default class RoleController extends GameObject {

    /** 状态 */
    private _state: GameState = GameState.NONE;

    /** 骨骼组件 */
    private _skeRole: sp.Skeleton = null;

    /** 角色状态 */
    private _roleState: RoleState = RoleState.NONE;

    /** 边界 */
    private _border: { left: number, right: number, up: number, down: number } = null;

    /** 人物速度 */
    private _roleSpeed: number = 0;

    public onLoad(): void {
        // 绑定骨骼组件
        this._skeRole = cc.find("ske_role", this.node).getComponent(sp.Skeleton);
        // 设置人物尺寸
        this._setCollisionSize(new cc.Size(100, 100));
        // 监听动画播放完毕
        this._skeRole.setCompleteListener((...args) => {
            if (this._roleState == RoleState.SMASH) {
                this._roleState = RoleState.IDLE;
                this._playAnim();
            }
        })
    }

    public start(): void {
    }

    public update(dt): void {
        if (this._state == GameState.PLAYING) {
            this._moveRole(dt);
        }
    }

    public onDestroy(): void {
    }

    /** 设置状态 */
    public setState(state: GameState): void {
        this._state = state;
    }

    /** 设置边界 */
    public setBorder(border: { left: number, right: number, up: number, down: number }): void {
        this._border = border;
    }

    /** 设置人物速度 */
    public setSpeed(speed: number): void {
        this._roleSpeed = speed;
    }

    /** 撞击障碍物 */
    public smashObstacle(): void {
        this._roleState = RoleState.SMASH;
        this._playAnim();
    }

    /** 播放静止动画 */
    public playIdle(): void {
        this._roleState = RoleState.IDLE;
        this._playAnim();
    }

    /** 播放移动动画 */
    public playWalk(): void {
        this._roleState = RoleState.WALK;
        this._playAnim();
    }

    /** 移动人物 */
    private _moveRole(dt: number): void {
        // 过滤无效节点
        if (!this.node) {
            console.error("_moveRole:参数无效");
            return;
        }

        // 计算下一个位置
        let nextPosX = this.node.x + this._roleSpeed * ROLE_SPEED * dt;

        // 超出边界
        if (this._checkOutBorder(nextPosX)) {
            // 静止
            if (this._roleState != RoleState.IDLE) {
                this._roleState = RoleState.IDLE;
                this._playAnim();
            }
            return;
        }

        // 改变模型方向
        this._changeSkeDir();

        // 走
        let speefAbs = Math.abs(this._roleSpeed);
        if (speefAbs > 0.1 && this._roleState != RoleState.WALK) {
            this._roleState = RoleState.WALK;
            this._playAnim();
        } 
        // 静止
        else if (speefAbs < 0.1 && this._roleState != RoleState.IDLE) {
            this._roleState = RoleState.IDLE;
            this._playAnim();
        }

        this.node.x = nextPosX;
    }

    /** 改变模型方向 */
    private _changeSkeDir(): void {
        // 过滤
        if (!this.node || !this._skeRole || !this._skeRole.node) {
            return;
        }

        // 右边
        if (this._roleSpeed > 0 && this._skeRole.node.scaleX > 0) {
            this._skeRole.node.scaleX = -this._skeRole.node.scaleX;
            // 偏移
            this._skeRole.node.x = 18;
        } 
        // 左边
        else if (this._roleSpeed < 0 && this._skeRole.node.scaleX < 0) {
            this._skeRole.node.scaleX = -this._skeRole.node.scaleX;
            // 偏移
            this._skeRole.node.x = -13;
        }
    }

    /** 播放动画 */
    private _playAnim(): void {
        // 过滤
        if (!this.node || !this._skeRole || !this._skeRole.node) {
            return;
        }

        switch (this._roleState) {
            case RoleState.NONE:
            case RoleState.IDLE:{
                this._skeRole.animation = "idle";
                break;
            }
            case RoleState.WALK:{
                this._skeRole.animation = "walk";
                break;
            }
            case RoleState.SMASH:{
                this._skeRole.animation = "surprise";
                break;
            }
            default: break;
        }
    }

    /** 检测是否超出边界 */
    private _checkOutBorder(posX: number): boolean {
        // 过滤无效参数
        if (!this._border || !this._collisionSize) {
            console.error("_checkOutBorder:参数无效");
            return false;
        }

        // 超出左边界
        if (this._border.left >= posX - this._collisionSize.width / 2) {
            return true;
        }

        // 超出右边界
        if (this._border.right <= posX + this._collisionSize.width / 2) {
            return true;
        }

        return false;
    }
}