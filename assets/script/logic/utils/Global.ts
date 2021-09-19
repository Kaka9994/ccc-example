import * as fcommon from "../../framework/core/common/pkg_common"
import * as ftimer from "../../framework/core/timer/pkg_timer"
import * as futils from "../../framework/core/utils/pkg_utils"
import * as frendermgr from "../../framework/manager/render/pkg_rendermgr"

/** 全局管理对象(通常用来管理一些全局的状态或对象，及依赖他们的一下方法) */
export default class Global implements fcommon.IDispose {
    /** 单例 */
    private static _me: Global = null
    public static get me(): Global {
        if (this._me == null) {
            this._me = new Global()
        }
        return this._me
    }

    /** 渲染管理器 */
    private _rendermgr: frendermgr.RenderManager = null
    /** 渲染管理器 */
    public get rendermgr(): frendermgr.RenderManager {
        return this._rendermgr
    }

    /**记录渲染帧对象 */
    private _renderCallObjs: { [type: number]: { obj: any, dispose: Function } } = null

    /** 销毁 */
    public dispose(): void {
        this.disposeRenderMgr()
    }

    /**
     * 初始化渲染管理器
     * @param info 渲染执行对象信息<RenderType, {obj:渲染执行对象, msPow:换算成ms的权重值, dipose:销毁对象方法, isLastRender:是否在update的最后才执行渲染}>
     */
    public initRenderMgr(info: {
        [type: number]: {
            obj: { update: (dt: number) => void }, // 渲染执行对象
            msPow: number, // 换算成ms的权重值
            dispose: Function, // 销毁对象方法
            isLastRender: boolean // 是否在update的最后才执行渲染
        }
    } = null): void {
        if (this._rendermgr == null) {
            this._rendermgr = new frendermgr.RenderManager()
        }

        // 初始化
        this._rendermgr.init()

        // 渲染类型列表
        let types: frendermgr.RenderType[] = [
            frendermgr.RenderType.DEF,
            frendermgr.RenderType.UI
        ]

        // 绑定渲染执行对象
        for (let i = 0, len = types.length; i < len; i++) {
            let t = types[i], tmp = info[t],
                obj = tmp?.obj, dispose = tmp?.dispose,
                msPow = tmp?.msPow, isLastRender = tmp?.isLastRender
            this.bindRenderCallObj(t, obj, msPow, dispose, isLastRender)
        }
    }

    /**
     * 绑定渲染执行对象
     * @param type 渲染类型
     * @param obj 执行对象{update:每帧更新函数}
     * @param msPow 换算成ms的权重值
     * @param dispose 销毁执行对象的方法
     * @param isLastRender 是否在update的最后才执行渲染
     * @return 执行对象
     */
    public bindRenderCallObj(
        type: frendermgr.RenderType,
        obj: { update: (dt: number) => void },
        msPow: number,
        dispose: Function,
        isLastRender: boolean): void {
        // 创建
        if (obj == null) {
            obj = {
                update: null
            }

            // 创建渲染帧对象
            let handler = fcommon.createHandler(obj.update, obj, null, false),
                frame = ftimer.createFrame(handler)

            // 外部参数赋值
            msPow = 1
            dispose = () => {
                ftimer.recoverFrame(frame)
            }
            isLastRender = false

            // 执行
            frame.start()
        }

        // 帧计时
        let renderMgrTime = 1

        // 记录渲染帧对象
        if (this._renderCallObjs == null) {
            this._renderCallObjs = {}
        }
        this._renderCallObjs[type] = { obj, dispose }

        // 构造渲染执行回调
        let self = this
        let func1 = function (dt: number) {
            if (self._rendermgr != null) {
                // 渲染帧数++
                renderMgrTime++
                // 重制渲染时间
                if (renderMgrTime >= Number.MAX_VALUE) {
                    renderMgrTime = 1
                }
                // 渲染
                self._rendermgr.render(renderMgrTime, dt, type)
            }
        }

        // 构造旧更新函数
        let oldUpdate = obj.update,
            func2 = function (dt: number) {
                oldUpdate && oldUpdate.call(obj, dt)
            }

        // 覆盖update
        obj.update = function (dt: number): void {
            // 换算成ms
            dt = dt * msPow
            
            // 执行顺序
            if (isLastRender) {
                func2.call(this, dt)
                func1.call(this, dt)
            } else {
                func1.call(this, dt)
                func2.call(this, dt)
            }
        }
    }

    /** 销毁渲染控制器 */
    public disposeRenderMgr(): void {
        // 销毁控制器
        if (this._rendermgr != null) {
            this._rendermgr.dispose()
            this._rendermgr = null
        }

        // 清理帧对象
        if (this._renderCallObjs != null) {
            for (let type in this._renderCallObjs) {
                let dispose = this._renderCallObjs[type]?.dispose
                if (typeof dispose === "function") {
                    dispose()
                }
            }
            this._renderCallObjs = null
        }
    }
}