import { Router } from 'express';
import { authGuard } from '../../middleware/auth.guard';
import { presignPut } from '../../services/s3.service';

export const uploadRouter = Router();

uploadRouter.post('/upload-url', authGuard, async (req, res, next) => {
  try {
    const key = `${req.user!.id}/${Date.now()}.webm`;
    const url = await presignPut(key);
    res.json({ success: true, data: { url, key } });
  } catch (err) {
    next(err);
  }
});
