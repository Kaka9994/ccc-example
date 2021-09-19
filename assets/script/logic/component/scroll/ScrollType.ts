

/** 滑动方向 */
export enum ScrollMoveDirType {
    /** 滑窗向上 */
    UP,
    /** 滑窗向左 */
    LEFT,
    /** 滑窗向下 */
    DOWN,
    /** 滑窗向右 */
    RIGHT,
    /** 滑窗向上或左 */
    UP_OR_LEFT,
    /** 滑窗向下或右 */
    DOWN_OR_RIGHT
}

/** 滑窗协程返回类型 */
export enum ScrollGeneratorType {
    /** 执行完毕 */
    DONE,
    /** 下一帧执行 */
    NEXT_FRAME,
    /** 渲染错误 */
    RENDER_ERROR
}