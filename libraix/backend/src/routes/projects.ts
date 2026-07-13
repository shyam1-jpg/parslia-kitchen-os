import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { isFeatureEnabled } from "../config/featureFlags.js";
import { findUserById, toSafeUser } from "../services/users.js";
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjectFiles,
  enqueueProjectFileIndex,
  registerProjectFile,
} from "../services/projects.js";

const router = Router();

router.use(requireAuth);

function checkAccess(req: import("express").Request, res: import("express").Response): boolean {
  const user = toSafeUser(findUserById(req.session.userId!)!);
  if (!isFeatureEnabled("projects", user.plan)) {
    res.status(403).json({ error: "FEATURE_DISABLED" });
    return false;
  }
  return true;
}

router.get("/", (req, res) => {
  if (!checkAccess(req, res)) return;
  res.json({ projects: listProjects(req.session.userId!) });
});

router.post("/", (req, res) => {
  if (!checkAccess(req, res)) return;
  const schema = z.object({ name: z.string().min(1).max(100), description: z.string().optional(), instructions: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const project = createProject(req.session.userId!, parsed.data.name, parsed.data.description, parsed.data.instructions);
  res.status(201).json(project);
});

router.get("/:id", (req, res) => {
  if (!checkAccess(req, res)) return;
  const project = getProject(req.session.userId!, req.params.id);
  if (!project) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ project, files: listProjectFiles(project.id) });
});

router.patch("/:id", (req, res) => {
  if (!checkAccess(req, res)) return;
  const ok = updateProject(req.session.userId!, req.params.id, req.body);
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

router.delete("/:id", (req, res) => {
  if (!checkAccess(req, res)) return;
  const ok = deleteProject(req.session.userId!, req.params.id);
  if (!ok) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ ok: true });
});

router.post("/:id/files", (req, res) => {
  if (!checkAccess(req, res)) return;
  const project = getProject(req.session.userId!, req.params.id);
  if (!project) return res.status(404).json({ error: "NOT_FOUND" });
  const schema = z.object({
    filename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().max(20_000_000).optional(),
    contentBase64: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  if (parsed.data.contentBase64) {
    try {
      const result = enqueueProjectFileIndex(
        project.id,
        parsed.data.filename,
        parsed.data.mimeType,
        parsed.data.contentBase64
      );
      res.status(202).json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UPLOAD_FAILED";
      res.status(400).json({ error: msg });
    }
    return;
  }

  if (!parsed.data.sizeBytes) return res.status(400).json({ error: "INVALID_INPUT" });
  const file = registerProjectFile(project.id, parsed.data.filename, parsed.data.mimeType, parsed.data.sizeBytes);
  res.status(201).json({ file, chunkCount: 0 });
});

export default router;
