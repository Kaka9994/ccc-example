import * as fbase from "../../../../framework/core/base/pkg_base"
import CustomAssembler from "../../render/assembler/CustomAssembler"
import TurnPageRenderComp from "./TurnPageRenderComp"

const { ccclass, property } = cc._decorator

// @ts-ignore
const gfx = cc.gfx;
let vfmtTurnPage = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },
    { name: "a_isFront", type: gfx.ATTR_TYPE_FLOAT32, num: 1 },
])

/** 翻页顶点数据装配器 */
@ccclass
export default class TurnPageAssembler extends CustomAssembler {
    /** 三角形数量(必须为偶数个，否则凑不成矩形) */
    private _triangleNum: number = 0
    /** 页面左下角世界坐标x */
    private _tx: number = 0
    /** 页面左下角世界坐标y */
    private _ty: number = 0

    /** 初始化 */
    public init(comp: TurnPageRenderComp) {
        this._triangleNum = comp.pointsNum
        super.init(comp)
    }

    /** 获取顶点格式 */
    protected getVfmt(): any {
        return vfmtTurnPage
    }

    /** 因为需要重新定义顶点数量，所以需要重写initData */
    protected initData(): void {
        // 初始化顶点数量
        this._verticesCount = this._triangleNum * 2
        this._indicesCount = this._triangleNum * 3
        this._floatsPerVert = 6

        // 初始化渲染数据
        // @ts-ignore
        this._renderData = new cc.RenderData()
        this._renderData.init(this)
        this._renderData.createFlexData(0, this.verticesFloats, this._indicesCount)

        // 初始化顶点索引
        let indices = this._renderData.iDatas[0]
        this._renderData.initQuadIndices(indices)
    }

    /** 更新渲染数据 */
    protected updateRenderData(comp: any) {
        if (comp._vertsDirty) {
            this.updateVertsNormal(comp)
            comp._vertsDirty = false
        }
    }

    /** 更新页面左下角世界坐标 */
    public updateTxTy(tx: number, ty: number): void {
        [this._tx, this._ty] = [tx, ty]
    }

    /** 通过传入点数据更新顶点 */
    public updateVertsByPoints(comp, points: cc.Vec2[]): void {
        let node = comp.node, uv = comp.uv,
            ch = node.height,
            ul = uv[0], ub = uv[1], ur = uv[2], ut = uv[5],
            uw = ur - ul, uh = ub - ut,
            uSpace = uw / (this._triangleNum / 2)

        let verts = this._renderData.vDatas[0]

        // 4个一组
        for (let i = 0, idx = 0, count = this._verticesCount / 4; i < count; i++) {
            idx = i * this._floatsPerVert * 4;
            let point1 = points[i],
                point2 = points[i + 1]
            if (point1 == null || point2 == null) {
                fbase.logger.error("updateVertsByPoints:顶点数据错误")
                break
            }

            // (left bottom)、(left top) 顶点位置需要与上一组的 (right bottom)、(right top) 保持一致
            let isFirst = idx == 0 ? true : false
            // 是否是正面
            let isFront = point1.x < point2.x ? 1 : 2

            // left bottom
            verts[idx] = point1.x + this._tx
            verts[idx + 1] = isFirst ? point1.y + this._ty : verts[idx - this._floatsPerVert * 3 + 1]
            verts[idx + 2] = isFront == 1 ? ul + i * uSpace : ur - i * uSpace
            verts[idx + 3] = ub
            verts[idx + 5] = isFront

            idx += this._floatsPerVert
            // right bottom
            verts[idx] = point2.x + this._tx
            verts[idx + 1] = point2.y + this._ty
            verts[idx + 2] = isFront == 1 ? ul + (i + 1) * uSpace : ur - (i + 1) * uSpace
            verts[idx + 3] = ub
            verts[idx + 5] = isFront

            idx += this._floatsPerVert
            // left top
            verts[idx] = point1.x + this._tx
            verts[idx + 1] = isFirst ? point1.y + ch + this._ty : verts[idx - this._floatsPerVert * 3 + 1]
            verts[idx + 2] = isFront == 1 ? ul + i * uSpace : ur - i * uSpace
            verts[idx + 3] = ub - uh
            verts[idx + 5] = isFront

            idx += this._floatsPerVert
            // right top
            verts[idx] = point2.x + this._tx
            verts[idx + 1] = point2.y + ch + this._ty
            verts[idx + 2] = isFront == 1 ? ul + (i + 1) * uSpace : ur - (i + 1) * uSpace
            verts[idx + 3] = ub - uh
            verts[idx + 5] = isFront
        }

        comp._vertsDirty = false
    }

    /** 默认更新顶点 */
    public updateVertsNormal(comp): void {
        let node = comp.node, uv = comp.uv,
            cw = node.width, ch = node.height,
            cl = -node.anchorX * cw, cb = -node.anchorY * ch,
            cSpace = cw / (this._triangleNum / 2),
            uw = uv[2] - uv[0], uh = uv[1] - uv[5],
            ul = uv[0], ub = uv[1],
            uSpace = uw / (this._triangleNum / 2)

        let matrix = comp.node._worldMatrix,
            tx = matrix.m12, ty = matrix.m13

        let verts = this._renderData.vDatas[0]

        // 4个一组(旋转/斜切无效)
        for (let i = 0, idx = 0, count = this._verticesCount / 4; i < count; i++) {
            idx = i * this._floatsPerVert * 4

            // left bottom、left top 顶点位置需要与上一组的 right right top 保持一致
            let isFirst = idx == 0 ? true : false

            // left bottom
            verts[idx] = cl + i * cSpace + tx
            verts[idx + 1] = isFirst ? cb + ty : verts[idx - this._floatsPerVert * 3 + 1]
            verts[idx + 2] = ul + i * uSpace
            verts[idx + 3] = ub

            idx += this._floatsPerVert
            // right bottom
            verts[idx] = cl + (i + 1) * cSpace + tx
            verts[idx + 1] = cb + ty
            verts[idx + 2] = ul + (i + 1) * uSpace
            verts[idx + 3] = ub

            idx += this._floatsPerVert
            // left top
            verts[idx] = cl + i * cSpace + tx
            verts[idx + 1] = isFirst ? cb + ch + ty : verts[idx - this._floatsPerVert * 3 + 1]
            verts[idx + 2] = ul + i * uSpace
            verts[idx + 3] = ub - uh

            idx += this._floatsPerVert
            // right top
            verts[idx] = cl + (i + 1) * cSpace + tx
            verts[idx + 1] = cb + ch + ty
            verts[idx + 2] = ul + (i + 1) * uSpace
            verts[idx + 3] = ub - uh
        }
    }
}