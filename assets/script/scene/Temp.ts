import * as base from "../framework/core/base/pkg_base"
import * as common from "../framework/core/common/pkg_common"
import * as utils from "../framework/core/utils/pkg_utils"
import * as timer from "../framework/core/timer/pkg_timer"
import * as pkg_loader from "../framework/core/loader/pkg_loader"
import * as pkg_loadmgr from "../framework/manager/load/pkg_loadmgr"
import * as pkg_soundmgr from "../framework/manager/sound/pkg_soundmgr"
import * as pkg_mvc from "../framework/mvc/pkg_mvc"

const { ccclass, property, executeInEditMode } = cc._decorator;

@ccclass
// @executeInEditMode
export default class Temp extends cc.Component {
    private _loadmgr: pkg_loadmgr.LoadManager = null
    private _soundmgr: pkg_soundmgr.SoundManager = null
    private _rendertime: number = 0

    // onLoad () {}

    start() {
        // cc.resources.load("images/speak_ui", cc.SpriteAtlas, (err, res) => {
        //     console.log("啥 -- ", res)
        //     window["kaka"] = res
        // })

        this._loadmgr = pkg_loadmgr.LoadManager.me
        this._soundmgr = pkg_soundmgr.SoundManager.me

        // this._soundmgr.playBGM("resources/audio/k1.mp3")

        window["kaka"] = this._soundmgr

        pkg_mvc.register("kaka", () => {
            return { "m": null, "v": null, "c": null }
        })

        // console.log("卡卡 --- ")
        // let url = "http://localhost:8080/speak_ui" // "resources/images/speak_ui" // "resources/Guide_S01/Guide_S01" // "http://localhost:8081/kaka.binary"
        // this._mgr.load(
        //     url,
        //     null,
        //     (info) => {
        //         console.log("这个呢 --- ", info)
        //         if (info[url] == null) {
        //             let data = window["kaka"] = this._mgr.getRes(url)
        //             let wawa = cc.find("wawa", this.node).getComponent(cc.Sprite)
        //             wawa.spriteFrame = (<cc.SpriteAtlas>data.getData()).getSpriteFrame("speak_img_100points.png")
        //         }
        //     },
        //     pkg_loadmgr.EnumLoadType.Atlas,
        // )
    }

    update(dt) {
        let dtms = dt * 1000
        this._rendertime += dtms
        this._loadmgr && this._loadmgr.render(this._rendertime, dtms)
        this._soundmgr && this._soundmgr.render(this._rendertime, dtms)
    }
}