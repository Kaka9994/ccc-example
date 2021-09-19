import CustomAssembler from "./CustomAssembler"

const { ccclass, property } = cc._decorator

// @ts-ignore
const gfx = cc.gfx;
let vfmtTurnPage = new gfx.VertexFormat([
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },
]);

/** 自定义精灵顶点数据装配器 */
@ccclass
export default class SpriteAssembler extends CustomAssembler {
    /** 获取顶点数据格式 */
    protected getVfmt(): any {
        return vfmtTurnPage;
    }

    /** 因为需要重新定义顶点数量，所以需要重写initData */
    protected initData(): void {
        // 初始化顶点配置
        this._verticesCount = 4
        this._indicesCount = 6
        this._floatsPerVert = 5

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
            this.updateUVs(comp)
            this.updateVerts(comp)
            comp._vertsDirty = false
        }
    }

    /** 更新uv */
    protected updateUVs(comp): void {
        // 获取spriteFrame对应的uv
        // uv数组长度=8，分别表示4个顶点的uv.x, uv.y
        // 按照左下、右下、左上、右上的顺序存储，注意这里的顺序和顶点索引的数据需要对应上
        let uv = comp.spriteFrame.uv
        let uvOffset = this._uvOffset
        let floatsPerVert = this._floatsPerVert
        let verts = this._renderData.vDatas[0]

        // 4个顶点一组，与顶点索引对应
        for (let i = 0; i < 4; i++) {
            // 2个1组取uv数据，写入renderData.vDatas对应位置
            let srcOffset = i * 2
            let dstOffset = floatsPerVert * i + uvOffset
            verts[dstOffset] = uv[srcOffset]
            verts[dstOffset + 1] = uv[srcOffset + 1]
        }
    }
}