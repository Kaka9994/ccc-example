import * as futils from "../../framework/core/utils/pkg_utils"

/** 
 * 获取节点或组件
 * @param root 查找的根节点
 * @param path 路径
 * @param comp 组件(查找组件时必填)
 * @param force 若为true，则查找不到节点(组件)会自动创建一个
 */
export function getNodeOrComponent<T>(root: cc.Node, path: string, comp: any = null, force: boolean = false): T {
    // 过滤无效参数
    if (futils.isEmpty(root)) {
        return null
    }

    let target = null

    // 获取根节点组件
    if (futils.isEmpty(path) && comp != null) {
        target = root.getComponent(comp)
        if (!force || target != null) {
            return target
        }

        target = root.addComponent(comp)
        return target
    }

    if (!force) {
        target = cc.find(path, root)
        if (target != null && comp != null) {
            target = target.getComponent(comp)
        }
        return target
    }

    let pathArr = path.split('/'), tmpRoot = root
    for (let i = 0, len = pathArr.length; i < len; i++) {
        let name = pathArr[i]
        target = tmpRoot.getChildByName(name)
        if (target == null) {
            target = new cc.Node(name)
            tmpRoot.addChild(target)
        }
        tmpRoot = target

        if (i == len - 1) {
            if (comp != null) {
                target = tmpRoot.getComponent(comp)
                if (target == null) {
                    target = tmpRoot.addComponent(comp)
                }
            }
        }
    }
    return target
}