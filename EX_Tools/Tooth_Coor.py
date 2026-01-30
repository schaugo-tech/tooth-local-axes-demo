# -*- coding: utf-8 -*-
"""
Tooth Pose Tuner (Open3D GUI)
- 旋转：3 个滑条（X/Y/Z 欧拉角，单位 deg）
- 平移：3 个滑条（X/Y/Z 平移，单位与你的模型一致；常见为 mm）
- 原点：默认取网格顶点质心(base_origin)，平移是在其基础上的增量
- 导出：打印一行  tooth_id  x y z  qw qx qy qz  （四元数为 wxyz）

依赖：
  pip install open3d numpy
用法：
  把 mesh_path 改成你的 stl/obj 路径（建议每颗牙一个文件）
"""

import numpy as np
import open3d as o3d
from open3d.visualization import gui, rendering


def euler_xyz_to_R(rx, ry, rz):
    cx, sx = np.cos(rx), np.sin(rx)
    cy, sy = np.cos(ry), np.sin(ry)
    cz, sz = np.cos(rz), np.sin(rz)
    Rx = np.array([[1, 0, 0],
                   [0, cx, -sx],
                   [0, sx, cx]], dtype=float)
    Ry = np.array([[cy, 0, sy],
                   [0, 1, 0],
                   [-sy, 0, cy]], dtype=float)
    Rz = np.array([[cz, -sz, 0],
                   [sz, cz, 0],
                   [0, 0, 1]], dtype=float)
    return Rz @ Ry @ Rx


def R_to_quat_wxyz(R):
    t = float(np.trace(R))
    if t > 0.0:
        S = np.sqrt(t + 1.0) * 2.0
        w = 0.25 * S
        x = (R[2, 1] - R[1, 2]) / S
        y = (R[0, 2] - R[2, 0]) / S
        z = (R[1, 0] - R[0, 1]) / S
    else:
        i = int(np.argmax([R[0, 0], R[1, 1], R[2, 2]]))
        if i == 0:
            S = np.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2]) * 2.0
            w = (R[2, 1] - R[1, 2]) / S
            x = 0.25 * S
            y = (R[0, 1] + R[1, 0]) / S
            z = (R[0, 2] + R[2, 0]) / S
        elif i == 1:
            S = np.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2]) * 2.0
            w = (R[0, 2] - R[2, 0]) / S
            x = (R[0, 1] + R[1, 0]) / S
            y = 0.25 * S
            z = (R[1, 2] + R[2, 1]) / S
        else:
            S = np.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1]) * 2.0
            w = (R[1, 0] - R[0, 1]) / S
            x = (R[0, 2] + R[2, 0]) / S
            y = (R[1, 2] + R[2, 1]) / S
            z = 0.25 * S

    q = np.array([w, x, y, z], dtype=float)
    n = np.linalg.norm(q)
    if n < 1e-12:
        return np.array([1.0, 0.0, 0.0, 0.0], dtype=float)
    return q / n


class PoseTunerApp:
    def __init__(self, mesh_path: str, tooth_id: int = 11):
        self.tooth_id = int(tooth_id)

        self.mesh = o3d.io.read_triangle_mesh(mesh_path)
        if self.mesh.is_empty():
            raise ValueError(f"Mesh is empty or failed to load: {mesh_path}")
        self.mesh.compute_vertex_normals()

        V = np.asarray(self.mesh.vertices, dtype=float)
        self.base_origin = V.mean(axis=0)  # 默认原点：质心
        self.tx = self.ty = self.tz = 0.0  # 平移增量
        self.rx = self.ry = self.rz = 0.0  # 弧度

        self.app = gui.Application.instance
        self.app.initialize()

        self.win = self.app.create_window("Tooth Pose Tuner", 1200, 850)
        self.scene = gui.SceneWidget()
        self.scene.scene = rendering.Open3DScene(self.win.renderer)

        mat = rendering.MaterialRecord()
        mat.shader = "defaultLitTransparency"
        mat.base_color = [0.9, 0.9, 0.9, 0.6]  # RGBA，最后一个是 alpha，0=全透明，1=不透明
        self.scene.scene.add_geometry("tooth", self.mesh, mat)

        self.frame_name = "frame"


        bbox = self.mesh.get_axis_aligned_bounding_box()
        self.scene.setup_camera(60.0, bbox, bbox.get_center())
        # self.scene.scene.set_background([1, 1, 1, 1])  # 需要白底可取消注释

        em = self.win.theme.font_size
        self.panel = gui.Vert(0, gui.Margins(em, em, em, em))

        self.sx = gui.Slider(gui.Slider.DOUBLE)
        self.sy = gui.Slider(gui.Slider.DOUBLE)
        self.sz = gui.Slider(gui.Slider.DOUBLE)
        self.sx.set_limits(-180.0, 180.0)
        self.sy.set_limits(-180.0, 180.0)
        self.sz.set_limits(-180.0, 180.0)

        self.stx = gui.Slider(gui.Slider.DOUBLE)
        self.sty = gui.Slider(gui.Slider.DOUBLE)
        self.stz = gui.Slider(gui.Slider.DOUBLE)
        self.stx.set_limits(-10.0, 10.0)
        self.sty.set_limits(-10.0, 10.0)
        self.stz.set_limits(-10.0, 10.0)

        def on_change(_):
            self.rx = np.deg2rad(self.sx.double_value)
            self.ry = np.deg2rad(self.sy.double_value)
            self.rz = np.deg2rad(self.sz.double_value)
            self.tx = float(self.stx.double_value)
            self.ty = float(self.sty.double_value)
            self.tz = float(self.stz.double_value)
            self._add_or_update_frame()

        self.sx.set_on_value_changed(on_change)
        self.sy.set_on_value_changed(on_change)
        self.sz.set_on_value_changed(on_change)
        self.stx.set_on_value_changed(on_change)
        self.sty.set_on_value_changed(on_change)
        self.stz.set_on_value_changed(on_change)

        self.panel.add_child(gui.Label("Rotate X (deg)")); self.panel.add_child(self.sx)
        self.panel.add_child(gui.Label("Rotate Y (deg)")); self.panel.add_child(self.sy)
        self.panel.add_child(gui.Label("Rotate Z (deg)")); self.panel.add_child(self.sz)

        self.panel.add_child(gui.Label("Translate X")); self.panel.add_child(self.stx)
        self.panel.add_child(gui.Label("Translate Y")); self.panel.add_child(self.sty)
        self.panel.add_child(gui.Label("Translate Z")); self.panel.add_child(self.stz)

        btn_export = gui.Button("Export pose (print)")
        btn_export.set_on_clicked(self.export_pose)
        self.panel.add_child(btn_export)

        btn_reset = gui.Button("Reset (rot=0, trans=0)")
        btn_reset.set_on_clicked(self.reset_pose)
        self.panel.add_child(btn_reset)

        self.info = gui.Label("")
        self.panel.add_child(self.info)
        self._add_or_update_frame()
        self._refresh_info_text()

        self.win.add_child(self.scene)
        self.win.add_child(self.panel)

        def on_layout(_):
            r = self.win.content_rect
            panel_w = int(24 * em)
            self.panel.frame = gui.Rect(r.x, r.y, panel_w, r.height)
            self.scene.frame = gui.Rect(r.x + panel_w, r.y, r.width - panel_w, r.height)

        self.win.set_on_layout(on_layout)

    def current_origin(self):
        return self.base_origin + np.array([self.tx, self.ty, self.tz], dtype=float)

    def current_R(self):
        return euler_xyz_to_R(self.rx, self.ry, self.rz)

    def _add_or_update_frame(self):
        R = self.current_R()
        origin = self.current_origin()

        frame = o3d.geometry.TriangleMesh.create_coordinate_frame(size=self._auto_frame_size(), origin=[0, 0, 0])
        frame.rotate(R, center=[0, 0, 0])
        frame.translate(origin, relative=True)

        if self.scene.scene.has_geometry(self.frame_name):
            self.scene.scene.remove_geometry(self.frame_name)
        self.scene.scene.add_geometry(self.frame_name, frame, rendering.MaterialRecord())
        self._refresh_info_text()

    def _auto_frame_size(self):
        bbox = self.mesh.get_axis_aligned_bounding_box()
        extent = bbox.get_extent()
        s = float(np.linalg.norm(extent)) * 0.12
        return max(s, 1e-3)

    def _refresh_info_text(self):
        origin = self.current_origin()
        q = R_to_quat_wxyz(self.current_R())
        self.info.text = (
            f"Origin: ({origin[0]:.3f}, {origin[1]:.3f}, {origin[2]:.3f})\n"
            f"Quat(wxyz): ({q[0]:.4f}, {q[1]:.4f}, {q[2]:.4f}, {q[3]:.4f})"
        )

    def reset_pose(self):
        self.sx.double_value = 0.0
        self.sy.double_value = 0.0
        self.sz.double_value = 0.0
        self.stx.double_value = 0.0
        self.sty.double_value = 0.0
        self.stz.double_value = 0.0

        self.rx = self.ry = self.rz = 0.0
        self.tx = self.ty = self.tz = 0.0
        self._add_or_update_frame()

    def export_pose(self):
        origin = self.current_origin()
        q = R_to_quat_wxyz(self.current_R())
        print(
            f"{self.tooth_id} "
            f"{origin[0]: .6f} {origin[1]: .6f} {origin[2]: .6f} "
            f"{q[0]: .6f} {q[1]: .6f} {q[2]: .6f} {q[3]: .6f}"
        )

    def run(self):
        self.app.run()


if __name__ == "__main__":
    # 改成你的牙齿网格文件路径
    PoseTunerApp(mesh_path="tooth_37.stl", tooth_id=37).run()
