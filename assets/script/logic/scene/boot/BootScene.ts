import * as frendermgr from "../../../framework/manager/render/pkg_rendermgr"
import Global from "../../utils/Global"

const { ccclass } = cc._decorator

/** 启动场景TODO */
@ccclass
export default class BootScene extends cc.Component {
}

/**
 * 使用框架的场景初始化装饰器
 * @return 类
 */
export function usingFramework<T extends { new(...args: any[]): {} }>(clz: T): T {
    return class extends clz {
        constructor(...agrs: any[]) {
            super(...agrs)

            if (CC_EDITOR) {
                return
            }

            // 创建渲染管理器TODO
            if (Global.me.rendermgr == null) {
                let scheduler = cc.director.getScheduler()

                // 创建外置渲染执行对象信息
                let outRender: { [type: number]: any } = {},
                    nDEF = new cc.Node("Render_Update_Def"),
                    nUI = new cc.Node("Render_Update_Ui")
                outRender[frendermgr.RenderType.DEF] = {
                    obj: nDEF,
                    msPow: 1000,
                    dispose: () => {
                        scheduler.unscheduleUpdate(nDEF)
                        nDEF.destroy()
                    },
                    isLastRender: false
                }
                outRender[frendermgr.RenderType.UI] = {
                    obj: nUI,
                    msPow: 1000,
                    dispose: () => {
                        scheduler.unscheduleUpdate(nUI)
                        nUI.destroy()
                    },
                    isLastRender: false
                }

                // 创建执行器
                scheduler.scheduleUpdate(nDEF, cc.Scheduler.PRIORITY_SYSTEM, false)
                scheduler.scheduleUpdate(nUI, cc.Scheduler.PRIORITY_SYSTEM, false)

                // 初始化渲染管理器
                Global.me.initRenderMgr(outRender)
            }
        }
    }
}