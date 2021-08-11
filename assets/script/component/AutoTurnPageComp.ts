import { TurnPageComp } from "./TurnPageComp";




const { ccclass, property } = cc._decorator;

/** 自动翻页组件 */
@ccclass
export default class AutoTurnPageComp extends TurnPageComp {

    private _autoMoving: boolean = false;
    private _resumeDir: cc.Vec2 = null;

    protected _onTouchStart(event: cc.Event.EventTouch): void {
        if (this._autoMoving) {
            return;
        }
        super._onTouchStart(event);
    }

    protected _onTouchMove(event: cc.Event.EventTouch): void {
        if (this._autoMoving) {
            return;
        }
        super._onTouchMove(event);
    }

    protected _onTouchEnd(event: cc.Event.EventTouch): void {
        if (this._turnRote > 0) {
            this._turnRote > 0.3 ? this._continue() : this._resume();
        } else {
            this._clear();
        }
    }

    /** 继续翻页 */
    private _continue(): void {
        // 过滤
        if (this._moveDir == null) {
            return;
        }

        this._autoMoving = true;

        let doMove = () => {
            let dir = this._moveDir.rotate(Math.PI / 2);
            let pos = this._caleRayAABB(dir, this._linePos,
                this._view.getContentSize(), cc.v2(this._view.position));
            if (pos == null || this._prohibitMove) {
                this._autoMoving = false;
                this._clear();
                return;
            }
            const dLen = 20;
            this._caleMove(this._moveDir.mul(dLen));

            this.scheduleOnce(() => {
                doMove();
            }, 0.001);
        }

        doMove();
    }

    /** 恢复 */
    private _resume(): void {
        // 过滤
        if (this._moveDir == null) {
            return;
        }

        this._resumeDir = this._moveDir.mul(-1);

        this._autoMoving = true;
        let dir = this._resumeDir.rotate(Math.PI / 2);

        let doMove = () => {
            let pos = this._caleRayAABB(dir, this._linePos,
                this._view.getContentSize(), cc.v2(this._view.position));
            if (pos == null || this._prohibitMove) {
                this._autoMoving = false;
                this._clear();
                return;
            }
            const dLen = 20;
            this._caleMove(this._resumeDir.mul(dLen));

            this.scheduleOnce(() => {
                doMove();
            }, 0.001);
        }

        doMove();
    }
}