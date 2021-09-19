
import * as QRCode from "../../../bin/qrcode"
import * as fbase from "../../../framework/core/base/pkg_base"
import * as futils from "../../../framework/core/utils/pkg_utils"

const { ccclass, requireComponent, executeInEditMode, property } = cc._decorator

const QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 }

/** 二维码组件(绘制尺寸与节点尺寸同步) */
@ccclass
@executeInEditMode
@requireComponent(cc.Graphics)
export default class QRCodeComp extends cc.Component {
    /** 二维码地址 */
    @property({ tooltip: "二维码地址" })
    private _url: string = ""
    @property
    public get url(): string {
        return this._url
    }
    public set url(url: string) {
        this._url = url
        this._setUrl(this._url)
    }

    /**
     * 设置二维码地址
     * @param url 二维码地址
     */
    private _setUrl(url: string): void {
        // 获取绘制组件
        let graphics = this.node.getComponent(cc.Graphics)
        if (graphics == null) {
            fbase.logger.error("setUrl:获取graphics失败")
            return
        }

        // 清空
        graphics.clear()

        // 过滤无效参数
        if (futils.isEmpty(url)) {
            fbase.logger.debug("setUrl:参数无效")
            return
        }

        // 创建二维码对象
        let qrcode = new QRCode(-1, QRErrorCorrectLevel.H)
        qrcode.addData(url)
        qrcode.make()

        // 计算像素块尺寸
        let count = qrcode.getModuleCount(),
            tileW = this.node.width / count,
            tileH = this.node.height / count,
            l = -this.node.width / 2,
            b = -this.node.height / 2

        // 绘制白色底图
        graphics.fillColor = cc.Color.WHITE
        graphics.rect(l, b, this.node.width, this.node.height)
        graphics.fill()

        // 绘制二维码
        graphics.fillColor = cc.Color.BLACK
        for (let row = 0; row < count; row++) {
            for (let col = 0; col < count; col++) {
                if (qrcode.isDark(row, col)) {
                    let w = (Math.ceil((col + 1) * tileW) - Math.floor(col * tileW))
                    let h = (Math.ceil((row + 1) * tileW) - Math.floor(row * tileW))
                    graphics.rect(l + Math.round(col * tileW), b + Math.round(row * tileH), w, h)
                    graphics.fill()
                }
            }
        }
    }
}