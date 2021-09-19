

const { ccclass, property } = cc._decorator

// @ts-ignore
const gfx = cc.gfx;
let vfmtCostom = new gfx.VertexFormat([
    // 节点的世界坐标，占2个float32
    { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },

    // 节点的纹理uv坐标，占2个float32
    // 如果节点使用了独立的纹理（未合图），这里的uv值通常是0或1
    // 合图后的纹理，这里的uv对应其在图集里的相对位置，取值范围在[0,1)内
    { name: gfx.ATTR_UV0, type: gfx.ATTR_TYPE_FLOAT32, num: 2 },

    // 节点颜色值，cc.Sprite组件上可以设置。占4个uint8 = 1个float32
    { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_UINT8, num: 4, normalize: true },
])

/** 自定义顶点数据装配器 */
@ccclass
// @ts-ignore
export default class CustomAssembler extends cc.Assembler {
    /** 渲染数据 */ // @ts-ignore
    protected _renderData: cc.RenderData = null
    /** 顶点数量(一个四边形4个顶点) */
    protected _verticesCount: number = 4
    /** 顶点索引数量(一个四边形按照对角拆分成2个三角形，2*3 = 6个顶点索引) */
    protected _indicesCount: number = 6
    /** 颜色值在顶点结构里的偏移(下标从4开始算) */
    protected _colorOffset: number = 4
    /** uv值在顶点结构里的偏移(下标从2开始算) */
    protected _uvOffset: number = 2
    /** 顶点结构占用float数量(vfmtPosUvColor 结构占5个float32) */
    protected _floatsPerVert: number = 5

    private _local: number[] = null;


    /** 获取当前节点的所有顶点数据总大小 */
    protected get verticesFloats(): number {
        return this._verticesCount * this._floatsPerVert
    }

    /** 获取顶点数据格式 */
    protected getVfmt(): any {
        return vfmtCostom
    }

    /** 返回一个能容纳自定义顶点数据的buffer */
    protected getBuffer(): any {
        // @ts-ignore
        return cc.renderer._handle.getBuffer("mesh", this.getVfmt())
    }

    /** 初始化 */
    public init(comp: cc.RenderComponent) {
        super.init(comp)
        
        this.initData()
        this.initLocal()
    }

    /** 初始化渲染数据 */
    protected initData(): void {
        // renderData.vDatas用来存储pos、uv、color数据
        // renderData.iDatas用来存储顶点索引数据
        // @ts-ignore
        this._renderData = new cc.RenderData()
        this._renderData.init(this)

        // createFlexData支持创建指定格式的renderData
        this._renderData.createFlexData(0, this.verticesFloats, this._indicesCount)

        // createFlexData不会填充顶点索引信息，手动补充一下
        let indices = this._renderData.iDatas[0]
        this._renderData.initQuadIndices(indices)

        // 下面是initQuadIndices的具体实现
        // 四边形分割成两个三角形下标: [0,1,2] [1,3,2]
        // 6个一组（对应1个四边形）生成索引数据
        // let indices = this._renderData.iDatas[0]
        // let count = indices.length / 6;
        // for (let i = 0, idx = 0; i < count; i++) {
        //     // 4个一组（4个顶点）
        //     let vertextID = i * 4
        //     indices[idx++] = vertextID
        //     indices[idx++] = vertextID + 1
        //     indices[idx++] = vertextID + 2
        //     indices[idx++] = vertextID + 1
        //     indices[idx++] = vertextID + 3
        //     indices[idx++] = vertextID + 2
        // }
    }

    /** 初始化本地数据 */
    protected initLocal(): void {
        let count = 4
        this._local = []
        for (let i = 0; i < count; i++) {
            this._local.push(0)
        }
    }

    /** 更新渲染数据 */
    protected updateRenderData(comp: any) {
        if (comp._vertsDirty) {
            this.updateVerts(comp)
            comp._vertsDirty = false
        }
    }

    /** 更新颜色 */
    protected updateColor(comp: any, color: number): void {
        // 过滤无效参数
        let uintVerts = this._renderData.uintVDatas[0]
        if (uintVerts == null) {
            return
        }

        color = color || comp.node.color._val
        let floatsPerVert = this._floatsPerVert
        let colorOffset = this._colorOffset

        for (let i = colorOffset, l = uintVerts.length; i < l; i += floatsPerVert) {
            uintVerts[i] = color
        }
    }

    /** 更新顶点 */
    protected updateVerts(comp): void {
        // 计算本地坐标，依据锚点计算四个顶点的起始值
        let node = comp.node,
            cw = node.width, ch = node.height,
            appx = node.anchorX * cw, appy = node.anchorY * ch,
            l, b, r, t

        l = -appx
        b = -appy
        r = cw - appx
        t = ch - appy

        // 设置本地坐标(节点的边界)
        let local = this._local
        local[0] = l
        local[1] = b
        local[2] = r
        local[3] = t

        // 更新顶点世界坐标
        this.updateWorldVerts(comp)
    }

    /** 更新顶点世界坐标 */
    protected updateWorldVerts(comp): void {
        // 世界变化，转换成世界坐标
        // _worldMatrix是4*4的矩阵，储存节点位移、旋转、缩放的信息
        // 其中m0、m1、m4、m5包含旋转和缩放的信息，tx,ty是位移信息
        // _worldMatrix的更新实现在CCNode.js里，区分了2d和3d，之所以_worldMatrix是4*4的矩阵主要也是对其3d，2d其实用3*3的矩阵就可以了

        let local = this._local
        let verts = this._renderData.vDatas[0]

        let matrix = comp.node._worldMatrix,
            a = matrix.m0, b = matrix.m1, c = matrix.m4, d = matrix.m5,
            tx = matrix.m12, ty = matrix.m13

        let vl = local[0], vr = local[2],
            vb = local[1], vt = local[3]

        let justTranslate = a === 1 && b === 0 && c === 0 && d === 1

        // 只有位移
        if (justTranslate) {
            // left bottom
            verts[0] = vl + tx
            verts[1] = vb + ty
            // right bottom
            verts[5] = vr + tx
            verts[6] = vb + ty
            // left top
            verts[10] = vl + tx
            verts[11] = vt + ty
            // right top
            verts[15] = vr + tx
            verts[16] = vt + ty
        } else {
            let al = a * vl, ar = a * vr,
                bl = b * vl, br = b * vr,
                cb = c * vb, ct = c * vt,
                db = d * vb, dt = d * vt

            // left bottom
            verts[0] = al + cb + tx
            verts[1] = bl + db + ty
            // right bottom
            verts[5] = ar + cb + tx
            verts[6] = br + db + ty
            // left top
            verts[10] = al + ct + tx
            verts[11] = bl + dt + ty
            // right top
            verts[15] = ar + ct + tx
            verts[16] = br + dt + ty
        }
    }

    /** 填充数据到buffer里 */
    protected fillBuffers(comp, renderer): void {
        // 如果节点的世界坐标发生变化，重新从当前节点的世界坐标计算一次顶点数据
        if (renderer.worldMatDirty) {
            this.updateWorldVerts(comp)
        }

        // 获取准备好的顶点数据
        // vData包含pos、uv、color数据
        // iData包含三角剖分后的顶点索引数据
        let renderData = this._renderData
        let vData = renderData.vDatas[0]
        let iData = renderData.iDatas[0]

        // 获取顶点缓存
        // getBuffer()方法后面会被我们重载，以便获得支持自定义顶点格式的缓存
        let buffer = this.getBuffer()

        // 获取当前节点的顶点数据对应最终buffer的偏移量
        // 可以简单理解为当前节点和其他同格式节点的数据，都将按顺序追加到这个大buffer里
        let offsetInfo = buffer.request(this._verticesCount, this._indicesCount)

        // fill vertices
        let vertexOffset = offsetInfo.byteOffset >> 2,
            vbuf = buffer._vData

        // 将准备好的vData拷贝到VetexBuffer里。这里会判断如果buffer装不下了，vData会被截断一部分
        // 通常是因为节点数量太多导致的，从下个节点开始会使用新的buffer，也就是重新开一个合批
        if (vData.length + vertexOffset > vbuf.length) {
            vbuf.set(vData.subarray(0, vbuf.length - vertexOffset), vertexOffset)
        } else {
            vbuf.set(vData, vertexOffset)
        }

        // 将准备好的iData拷贝到IndiceBuffer里
        let ibuf = buffer._iData,
            indiceOffset = offsetInfo.indiceOffset,
            vertexId = offsetInfo.vertexOffset
        for (let i = 0, l = iData.length; i < l; i++) {
            ibuf[indiceOffset++] = vertexId + iData[i]
        }
    }
}