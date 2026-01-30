# -*- coding: utf-8 -*-
"""
Transparent Teeth + Opaque Local Frames Viewer (Open3D GUI)

功能：
1) 读取“局部坐标系文件”：每行
      tooth_id  x  y  z  qw  qx  qy  qz
   其中四元数为 wxyz，建议已归一化（脚本也会归一化）。

2) 加载对应的 STL：
      默认命名规则：tooth_{id}.stl
      例如 tooth_11.stl, tooth_12.stl ...

3) 显示：
   - 世界全局坐标系（原点）一个大坐标轴（不透明）
   - 每颗牙局部坐标轴（不透明，按四元数旋转、放在原点xyz）
   - 每颗牙 STL 网格（半透明）

依赖：
  pip install open3d numpy

使用：
  直接修改下面 main() 里的 POSE_TXT, STL_DIR, STL_NAME_PATTERN 即可运行。
"""

import os
import numpy as np
import open3d as o3d
from open3d.visualization import gui, rendering


def parse_pose_file(path: str):
    """
    返回 dict[int] -> (origin(3,), quat_wxyz(4,))
    忽略空行与无法解析行
    """
    poses = {}
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            s = line.strip()
            if not s:
                continue
            parts = s.split()
            if len(parts) < 8:
                continue
            try:
                tid = int(parts[0])
                x, y, z = map(float, parts[1:4])
                qw, qx, qy, qz = map(float, parts[4:8])
            except Exception:
                continue

            q = np.array([qw, qx, qy, qz], dtype=float)
            n = float(np.linalg.norm(q))
            if n < 1e-12:
                q = np.array([1.0, 0.0, 0.0, 0.0], dtype=float)
            else:
                q = q / n

            poses[tid] = (np.array([x, y, z], dtype=float), q)

    if not poses:
        raise ValueError(f"No valid pose lines parsed from: {path}")
    return poses


def quat_wxyz_to_R(q):
    """
    q = [w,x,y,z] -> 3x3 rotation matrix
    """
    w, x, y, z = map(float, q)
    ww, xx, yy, zz = w*w, x*x, y*y, z*z
    R = np.array([
        [ww + xx - yy - zz, 2*(x*y - w*z),     2*(x*z + w*y)],
        [2*(x*y + w*z),     ww - xx + yy - zz, 2*(y*z - w*x)],
        [2*(x*z - w*y),     2*(y*z + w*x),     ww - xx - yy + zz],
    ], dtype=float)
    return R


def make_frame(origin, q_wxyz, size=5.0):
    """
    生成一个坐标轴 mesh：先在原点生成，再按 q 旋转，最后平移到 origin
    """
    R = quat_wxyz_to_R(q_wxyz)
    frame = o3d.geometry.TriangleMesh.create_coordinate_frame(size=float(size), origin=[0, 0, 0])
    frame.rotate(R, center=[0, 0, 0])
    frame.translate(origin, relative=True)
    return frame


def load_tooth_mesh(stl_path: str):
    mesh = o3d.io.read_triangle_mesh(stl_path)
    if mesh.is_empty():
        return None
    mesh.compute_vertex_normals()
    return mesh


class ViewerApp:
    def __init__(self, pose_txt: str, stl_dir: str, stl_name_pattern: str = "tooth_{id}.stl",
                 tooth_alpha: float = 0.35, background_white: bool = True):
        self.pose_txt = pose_txt
        self.stl_dir = stl_dir
        self.stl_name_pattern = stl_name_pattern
        self.tooth_alpha = float(tooth_alpha)
        self.background_white = bool(background_white)

        self.poses = parse_pose_file(self.pose_txt)

        self.app = gui.Application.instance
        self.app.initialize()
        self.win = self.app.create_window("Teeth (Transparent) + Frames (Opaque)", 1400, 900)

        self.scene_widget = gui.SceneWidget()
        self.scene_widget.scene = rendering.Open3DScene(self.win.renderer)
        self.win.add_child(self.scene_widget)

        if self.background_white:
            self.scene_widget.scene.set_background([1, 1, 1, 1])

        # 透明牙齿材质
        self.tooth_mat = rendering.MaterialRecord()
        self.tooth_mat.shader = "defaultLitTransparency"
        self.tooth_mat.base_color = [1.0, 1.0, 1.0, max(0.0, min(1.0, self.tooth_alpha))]

        # 坐标轴材质（不透明）
        self.frame_mat = rendering.MaterialRecord()
        self.frame_mat.shader = "defaultLit"

        # 加载几何体
        self._add_geometries()

        # 布局：Scene 填满窗口
        def on_layout(_):
            r = self.win.content_rect
            self.scene_widget.frame = gui.Rect(r.x, r.y, r.width, r.height)
        self.win.set_on_layout(on_layout)

        # 相机
        bbox = self.scene_widget.scene.bounding_box
        self.scene_widget.setup_camera(60.0, bbox, bbox.get_center())

    def _add_geometries(self):
        # 全局坐标轴
        global_frame = o3d.geometry.TriangleMesh.create_coordinate_frame(size=20.0, origin=[0, 0, 0])
        self.scene_widget.scene.add_geometry("global_frame", global_frame, self.frame_mat)

        # 用原点分布自适应一个局部轴尺寸
        origins = np.stack([v[0] for v in self.poses.values()], axis=0)
        diag = float(np.linalg.norm(origins.max(axis=0) - origins.min(axis=0)))
        local_frame_size = max(diag * 0.03, 2.0)

        missing = []
        for tid, (origin, q) in self.poses.items():
            stl_name = self.stl_name_pattern.format(id=tid)
            stl_path = os.path.join(self.stl_dir, stl_name)

            mesh = load_tooth_mesh(stl_path)
            if mesh is None:
                missing.append(stl_name)
            else:
                self.scene_widget.scene.add_geometry(f"tooth_{tid}", mesh, self.tooth_mat)

            frame = make_frame(origin, q, size=local_frame_size)
            self.scene_widget.scene.add_geometry(f"frame_{tid}", frame, self.frame_mat)

        if missing:
            print("Warning: STL not found or failed to load:")
            for name in missing:
                print("  ", name)

    def run(self):
        self.app.run()


def main():
    # ====== 修改这 3 个变量 ======
    POSE_TXT = r"C:\Users\admin\Desktop\ToothOpt\CoordStep0.txt"
    STL_DIR  = r"C:\Users\admin\Desktop\ToothOpt\stl_teeth"
    STL_NAME_PATTERN = "tooth_{id}.stl"
    # ============================

    ViewerApp(
        pose_txt=POSE_TXT,
        stl_dir=STL_DIR,
        stl_name_pattern=STL_NAME_PATTERN,
        tooth_alpha=0.35,          # 0=全透明  1=不透明
        background_white=True
    ).run()


if __name__ == "__main__":
    main()
